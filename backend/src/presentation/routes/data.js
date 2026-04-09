import express from 'express';
import { authenticate } from '../middleware/authentication.js';
import { authorizeAdmin } from '../middleware/authorization.js';
import { triggerManualCollection } from '../../infrastructure/jobs/DailyCollectionJob.js';
import { auditLogger } from '../../infrastructure/services/AuditLogger.js';
import { getCacheRepository } from '../../infrastructure/repositories/CacheRepositorySingleton.js';

const router = express.Router();

router.use(authenticate);
router.use(authorizeAdmin);

router.post('/refresh', async (req, res, next) => {
  try {
    const userId = req.user?.userId || req.user?.sub || 'mvp-user';
    const authHeader = req.headers.authorization;
    const token = req.headers.authorization?.substring(7);
    const normalizedToken = typeof token === 'string' ? token.trim() : '';
    console.log('[TEMP DEBUG][DataRoute.refresh] Authorization intake:', {
      authorizationHeaderExists: typeof authHeader === 'string' && authHeader.trim() !== '',
      authorizationHeaderPrefix: typeof authHeader === 'string' && authHeader.trim() !== '' ? `${authHeader.slice(0, 18)}...` : null,
      extractedTokenExists: normalizedToken !== '',
      extractedTokenPrefix: normalizedToken !== '' ? `${normalizedToken.slice(0, 18)}...` : null
    });
    const services = Array.isArray(req.body?.services) ? req.body.services : null;
    
    // Log data refresh initiation
    auditLogger.logDataRefresh(userId, 'initiated');
    
    const results = await triggerManualCollection(token, services);
    
    // Log data refresh completion
    auditLogger.logDataRefresh(userId, results.partial ? 'partial' : 'success', {
      successful: results.successful,
      failed: results.failed
    });
    
    res.json({
      message: 'Data refresh completed',
      status: 'success',
      results: {
        successful: results.successful,
        failed: results.failed,
        partial: results.partial,
        allFailed: results.allFailed || false
      }
    });
  } catch (error) {
    const userId = req.user?.userId || req.user?.sub || 'mvp-user';
    auditLogger.logDataRefresh(userId, 'failure', {
      error: error.message
    });
    next(error);
  }
});

router.get('/status', async (req, res, next) => {
  try {
    // In production, this would check actual cache status
    res.json({
      lastUpdated: new Date().toISOString(),
      status: 'operational',
      cacheConnected: true
    });
  } catch (error) {
    next(error);
  }
});

// New endpoint to view raw mock data
router.get('/raw', async (req, res, next) => {
  try {
    const cacheRepository = getCacheRepository();
    const { service } = req.query;
    
    if (service) {
      // Get data for specific service
      const latest = await cacheRepository.getLatestByService(service);
      if (!latest) {
        return res.status(404).json({
          error: `No data found for service: ${service}`,
          availableServices: ['directory', 'courseBuilder', 'assessment', 'contentStudio', 'learningAnalytics']
        });
      }
      
      return res.json({
        service,
        data: latest,
        structure: {
          timestamp: latest.timestamp,
          data: {
            metrics: Object.keys(latest.data?.metrics || {}),
            details: Object.keys(latest.data?.details || {})
          },
          metadata: latest.metadata
        }
      });
    }
    
    // Get all services data
    const latestEntries = await cacheRepository.getLatestEntries();
    
    const formattedData = latestEntries.map(({ service, data }) => ({
      service,
      timestamp: data.timestamp,
      metrics: data.data?.metrics || {},
      details: data.data?.details || {},
      metadata: data.metadata,
      sampleData: {
        metricsCount: Object.keys(data.data?.metrics || {}).length,
        detailsKeys: Object.keys(data.data?.details || {}),
        sampleMetrics: Object.fromEntries(
          Object.entries(data.data?.metrics || {}).slice(0, 5)
        ),
        sampleDetails: service === 'directory' ? 
          { usersCount: data.data?.details?.users?.length || 0 } :
          service === 'courseBuilder' ?
          { coursesCount: data.data?.details?.courses?.length || 0 } :
          service === 'assessment' ?
          { assessmentsCount: data.data?.details?.assessments?.length || 0 } :
          service === 'contentStudio' ?
          { contentItemsCount: data.data?.details?.contentItems?.length || 0 } :
          { trendsCount: data.data?.details?.trends?.length || 0 }
      }
    }));
    
    res.json({
      totalServices: formattedData.length,
      services: formattedData.map(d => d.service),
      data: formattedData,
      instructions: {
        viewSpecificService: `/api/v1/data/raw?service=<service_name>`,
        availableServices: ['directory', 'courseBuilder', 'assessment', 'contentStudio', 'learningAnalytics']
      }
    });
  } catch (error) {
    next(error);
  }
});

export default router;
