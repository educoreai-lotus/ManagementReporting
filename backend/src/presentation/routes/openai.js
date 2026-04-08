import { Router } from 'express';
import chartNarrationService from '../../application/services/ChartNarrationService.js';
import reportConclusionsService from '../../application/services/ReportConclusionsService.js';
import { getCachedTranscription, saveTranscription } from '../../infrastructure/repositories/ChartTranscriptionsRepository.js';
import { computeChartSignature } from '../../utils/hash.js';
import * as Repo from '../../infrastructure/repositories/ChartTranscriptionsRepository.js';
import { getPool, withRetry } from '../../infrastructure/db/pool.js';
import { authenticate } from '../middleware/authentication.js';
import { authorizeAdmin } from '../middleware/authorization.js';

console.debug('[AI] openai route loaded. Signature function OK.');
console.debug('[BOOT] Repo keys ->', Object.keys(Repo));

const router = Router();
router.use(authenticate);
router.use(authorizeAdmin);

/**
 * POST /api/v1/openai/describe-chart
 * body: { imageUrl?: string, dataUrl?: string, context?: string, fast?: boolean }
 * Legacy endpoint - still works but doesn't use caching
 */
router.post('/describe-chart', async (req, res) => {
  try {
    const { imageUrl, dataUrl, context, fast } = req.body || {};
    const image = imageUrl || dataUrl;
    
    if (!image) {
      return res.status(400).json({ 
        ok: false, 
        error: 'imageUrl or dataUrl is required' 
      });
    }

    // Validate image format
    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'imageUrl must be a valid HTTP/HTTPS URL' 
      });
    }

    if (dataUrl && !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'dataUrl must be a valid data URL (data:image/...)' 
      });
    }

    const text = await chartNarrationService.describeChartImage(image, {
      context,
      model: fast ? 'gpt-4o-mini' : undefined
    });

    res.json({ ok: true, text });
  } catch (err) {
    console.error('describe-chart error:', err);
    res.status(500).json({ 
      ok: false, 
      error: err?.message || 'AI error' 
    });
  }
});

/**
 * POST /api/v1/openai/transcribe-chart
 * Optimized endpoint with Supabase caching
 * body: {
 *   chartId: string (required),
 *   topic?: string,
 *   chartData?: object,
 *   imageUrl?: string,
 *   dataUrl?: string,
 *   force?: boolean
 * }
 */
router.post('/transcribe-chart', async (req, res) => {
  try {
    const { chartId, topic, chartData, imageUrl, dataUrl, force } = req.body || {};
    const image = imageUrl || dataUrl;
    
    if (!chartId || typeof chartId !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'chartId (string) is required' 
      });
    }
    
    if (!image) {
      return res.status(400).json({ 
        ok: false, 
        error: 'imageUrl or dataUrl is required' 
      });
    }

    // Validate image format
    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'imageUrl must be a valid HTTP/HTTPS URL' 
      });
    }

    if (dataUrl && !dataUrl.startsWith('data:image/')) {
      return res.status(400).json({ 
        ok: false, 
        error: 'dataUrl must be a valid data URL (data:image/...)' 
      });
    }

    // Compute signature for caching
    const signature = computeChartSignature(topic || '', chartData || {});
    
    // Check cache unless force=true
    if (!force) {
      const cached = await getCachedTranscription(chartId, signature);
      if (cached) {
        return res.json({ 
          ok: true, 
          source: 'cache', 
          signature, 
          text: cached 
        });
      }
    }

    // Generate new transcription via OpenAI
    const model = 'gpt-4o';
    const text = await chartNarrationService.describeChartImage(image, {
      context: topic,
      model
    });

    // Save to cache (compatibility function - accepts separate params)
    await saveTranscription(chartId, signature, model, text);

    return res.json({ 
      ok: true, 
      source: 'ai', 
      signature, 
      text 
    });
  } catch (err) {
    console.error('Transcription error:', err);
    return res.status(500).json({ 
      ok: false, 
      error: err?.message || 'AI error' 
    });
  }
});

/**
 * POST /api/v1/openai/report-conclusions
 * body: { topic: string, images: string[] }
 */
const rollbackFallback = {
  conclusions: [
    { 
      statement: 'Report generated successfully with available data.', 
      rationale: 'Default fallback content displayed when AI service is temporarily unavailable.', 
      confidence: 0 
    },
    { 
      statement: 'Charts show stable performance metrics across analyzed periods.', 
      rationale: 'Displayed when AI service unavailable. Manual review recommended.', 
      confidence: 0 
    },
    { 
      statement: 'No critical anomalies detected in the current dataset.', 
      rationale: 'Rollback default conclusion. AI analysis pending.', 
      confidence: 0 
    },
    { 
      statement: 'Further detailed analysis recommended once AI connection is restored.', 
      rationale: 'Fallback rationale. Please regenerate report when AI service is available.', 
      confidence: 0 
    }
  ]
};

router.post('/report-conclusions', async (req, res) => {
  try {
    const { topic, images } = req.body || {};
    
    if (!topic || typeof topic !== 'string') {
      return res.status(400).json({ 
        ok: false, 
        error: 'topic (string) is required' 
      });
    }
    
    if (!Array.isArray(images) || images.length === 0) {
      return res.status(400).json({ 
        ok: false, 
        error: 'images (array) with at least one image is required' 
      });
    }

    // Validate image format
    for (const img of images) {
      if (typeof img !== 'string') {
        return res.status(400).json({ 
          ok: false, 
          error: 'All images must be strings (URLs or data URLs)' 
        });
      }
      if (!img.startsWith('http://') && !img.startsWith('https://') && !img.startsWith('data:image/')) {
        return res.status(400).json({ 
          ok: false, 
          error: 'Images must be valid URLs or data URLs' 
        });
      }
    }

    const data = await reportConclusionsService.generateReportConclusions(topic, images);
    
    // Save conclusions to database (non-blocking side-effect)
    try {
      if (process.env.DATABASE_URL && data && data.conclusions && Array.isArray(data.conclusions)) {
        const pool = getPool();
        const reportId = req.body.report_id || null; // Optional report_id from request
        const reportName = topic; // Use topic as report_name
        
        await withRetry(async () => {
          return await pool.query(
            `INSERT INTO ai_report_conclusions (report_id, report_name, conclusions, generated_at)
             VALUES ($1, $2, $3, $4)`,
            [reportId, reportName, data, new Date()]
          );
        }, 3);
        
        console.log(`[Report Conclusions] ✅ Saved to DB: report_name="${reportName}"`);
      }
    } catch (dbError) {
      // Log error but don't break the API response
      console.error('[Report Conclusions] ❌ Failed to save to DB:', dbError.message);
    }
    
    res.json({ ok: true, source: 'ai', data });
  } catch (err) {
    console.error('OpenAI conclusions failed:', err.message);
    // Return rollback with 200 status (not error) so UI can display it
    res.status(200).json({ ok: true, source: 'rollback', data: rollbackFallback });
  }
});

export default router;

