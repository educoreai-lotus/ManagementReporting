import OpenAI from 'openai';

if (!process.env.OPENAI_KEY) {
  console.warn('[transcribeChartService] Missing OPENAI_KEY');
}

const openai = process.env.OPENAI_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_KEY })
  : null;

// System prompt for chart transcription (image-based)
// Request: concise title + 3-6 bullet points with insights
const IMAGE_SYSTEM_PROMPT = `You are a visual data analyst. You receive chart images and must describe them clearly.
Your output should include:
- One concise title
- 3–6 short bullet points summarizing insights
- Avoid made-up numbers; use "approximately" if unclear.`.trim();

// System prompt for chart transcription (JSON-based)
const JSON_SYSTEM_PROMPT = `You are a senior data analyst. You receive structured chart data as JSON.
Provide one concise title and 3–6 short bullet points summarizing the key insights.
Focus on trends, comparisons, and notable changes. Do not invent data not present in the JSON.`.trim();

/**
 * Transcribe chart image using OpenAI Vision API
 * @param {Object} params - Transcription parameters
 * @param {string} params.imageUrl - Chart image URL or data URL
 * @param {string} params.context - Optional context about the chart
 * @returns {Promise<string>} Transcription text
 */
/**
 * Retry with exponential backoff for 429 errors
 */
async function withRetry(fn, attempts = 3) {
  let delay = 2000; // Start with 2 seconds
  
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      const isRateLimit = err?.status === 429 || err?.message?.includes('rate_limit') || err?.message?.includes('429');
      
      if (isRateLimit && i < attempts - 1) {
        console.warn(`[transcribeChartImage] 429 Rate limit detected, retrying in ${delay}ms (attempt ${i + 1}/${attempts})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff: 2s, 4s, 8s
      } else {
        throw err;
      }
    }
  }
}

export async function transcribeChartImage({ imageUrl, context }) {
  if (!openai) {
    // Mock fallback for development
    return `Chart Analysis\n• This chart displays data trends\n• Key metrics are visible\n• Patterns indicate ${context || 'general performance'}\n• Further analysis recommended`;
  }

  // ⚠️ CRITICAL: Use gpt-4o-mini instead of gpt-4o to reduce token usage and cost
  // gpt-4o-mini has higher TPM limits and lower cost
  const model = 'gpt-4o-mini';
  
  // ⚠️ CRITICAL: Keep context minimal to reduce tokens
  const minimalContext = context ? context.substring(0, 50) : 'Chart analysis';

  try {
    console.log(`[OpenAI] 📞 CALLING OpenAI API...`);
    console.log(`[OpenAI] Model: ${model}`);
    console.log(`[OpenAI] Image URL length: ${imageUrl?.length || 0}`);
    console.log(`[OpenAI] Context: ${minimalContext}`);
    
    // Wrap OpenAI call with retry logic
    const response = await withRetry(async () => {
      return await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: IMAGE_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: [
              {
                type: 'text',
                text: `Chart: ${minimalContext}`
              },
              {
                type: 'image_url',
                image_url: {
                  url: imageUrl
                }
              }
            ]
          }
        ],
        max_tokens: 400 // Increased to 400 for better quality transcriptions
      });
    }, 3);

    console.log(`[OpenAI] ✅ RESPONSE RECEIVED from OpenAI`);
    
    const text = response.choices[0]?.message?.content?.trim() || '';
    
    console.log(`[OpenAI] Response text length: ${text?.length || 0} chars`);
    console.log(`[OpenAI] Response preview: ${text?.substring(0, 100)}...`);
    
    if (!text) {
      console.error(`[OpenAI] ❌ ERROR: Empty transcription from OpenAI`);
      throw new Error('Empty transcription from OpenAI');
    }
    
    console.log(`[OpenAI] ✅ SUCCESS: Valid transcription received from OpenAI`);
    return text;
  } catch (error) {
    console.error('[transcribeChartImage] OpenAI error:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    // Fallback to mock
    return `Chart Analysis\n• This chart displays data trends\n• Key metrics are visible\n• Patterns indicate ${context || 'general performance'}\n• Further analysis recommended`;
  }
}

export async function transcribeChartJson({ chartPayload, context }) {
  if (!openai) {
    return `Chart Analysis
• This chart displays data trends
• Key metrics are visible
• Patterns indicate ${context || 'general performance'}
• Further analysis recommended`;
  }

  const model = 'gpt-4o-mini';
  let serializedPayload = '{}';

  try {
    serializedPayload = JSON.stringify(chartPayload || {});
  } catch (err) {
    console.error('[transcribeChartJson] Failed to serialize chart payload:', err);
    serializedPayload = '{}';
  }

  if (serializedPayload.length > 12000) {
    console.warn(`[transcribeChartJson] ⚠️ Chart payload too large (${serializedPayload.length} chars), truncating`);
    serializedPayload = serializedPayload.slice(0, 12000);
  }

  try {
    console.log(`[OpenAI] 📞 CALLING OpenAI API for JSON chart transcription...`);
    console.log(`[OpenAI] Model: ${model}`);
    console.log(`[OpenAI] Serialized payload length: ${serializedPayload.length}`);

    const response = await withRetry(async () => {
      return await openai.chat.completions.create({
        model: model,
        messages: [
          {
            role: 'system',
            content: JSON_SYSTEM_PROMPT
          },
          {
            role: 'user',
            content: `Context: ${context || 'Chart'}\n\nChart JSON:\n${serializedPayload}`
          }
        ],
        max_tokens: 400
      });
    }, 3);

    console.log(`[OpenAI] ✅ RESPONSE RECEIVED from OpenAI (JSON flow)`);

    const text = response.choices[0]?.message?.content?.trim() || '';

    console.log(`[OpenAI] Response text length: ${text?.length || 0} chars`);
    console.log(`[OpenAI] Response preview: ${text?.substring(0, 100)}...`);

    if (!text) {
      console.error(`[OpenAI] ❌ ERROR: Empty transcription from OpenAI (JSON flow)`);
      throw new Error('Empty transcription from OpenAI');
    }

    console.log(`[OpenAI] ✅ SUCCESS: Valid transcription received from OpenAI (JSON flow)`);
    return text;
  } catch (error) {
    console.error('[transcribeChartJson] OpenAI error:', {
      message: error.message,
      status: error.status,
      code: error.code
    });
    return `Chart Analysis
• This chart displays data trends
• Key metrics are visible
• Patterns indicate ${context || 'general performance'}
• Further analysis recommended`;
  }
}

