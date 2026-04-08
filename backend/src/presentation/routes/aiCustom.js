import { Router } from 'express';
import { AICustomSqlService } from '../../application/services/AICustomSqlService.js';
import { getPool } from '../../infrastructure/db/pool.js';
import { validateSqlSafety, addLimitIfMissing } from '../../utils/sqlSafety.js';
import { authenticate } from '../middleware/authentication.js';
import { authorizeAdmin } from '../middleware/authorization.js';

const router = Router();
router.use(authenticate);
router.use(authorizeAdmin);

// Initialize service (will throw if OPENAI_KEY is missing)
let aiCustomSqlService;
try {
  aiCustomSqlService = new AICustomSqlService();
} catch (error) {
  console.error('[aiCustom route] ❌ Failed to initialize AICustomSqlService:', error.message);
  console.error('[aiCustom route] ⚠️  AI Custom SQL endpoint will not be available');
}

/**
 * POST /api/ai-custom/sql
 * Generates a SQL query from natural language using OpenAI.
 * 
 * Request body:
 * {
 *   "queryText": string (required, 1-1000 characters)
 * }
 * 
 * Response (200 OK):
 * {
 *   "status": "ok" | "no_match" | "error",
 *   "sql": string | null,
 *   "reason": string,
 *   "message"?: string (for no_match status)
 * }
 */
router.post('/sql', async (req, res) => {
  try {
    // Check if service is available
    if (!aiCustomSqlService) {
      return res.status(503).json({
        status: 'error',
        error: 'SERVICE_UNAVAILABLE',
        message: 'AI Custom SQL service is not available. OPENAI_KEY may be missing.'
      });
    }

    // Validate request body
    const { queryText } = req.body || {};

    if (!queryText || typeof queryText !== 'string') {
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_INPUT',
        message: 'queryText must be a non-empty string up to 1000 characters.'
      });
    }

    const trimmedText = queryText.trim();

    if (trimmedText.length === 0) {
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_INPUT',
        message: 'queryText must be a non-empty string up to 1000 characters.'
      });
    }

    if (trimmedText.length > 1000) {
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_INPUT',
        message: 'queryText must not exceed 1000 characters.'
      });
    }

    // Log request (truncated for privacy)
    console.log('[aiCustom/sql] 📥 Request received, queryText length:', trimmedText.length);

    // Generate SQL using OpenAI
    const result = await aiCustomSqlService.generateSqlWithOpenAi(trimmedText);

    // Handle different statuses
    if (result.status === 'ok' && result.sql && result.sql.trim().length > 0) {
      console.log('[aiCustom/sql] ✅ SQL generated successfully, length:', result.sql.length);
      return res.status(200).json({
        status: 'ok',
        sql: result.sql,
        reason: result.reason
      });
    }

    if (result.status === 'no_match') {
      console.log('[aiCustom/sql] ⚠️  No match found for user request');
      return res.status(200).json({
        status: 'no_match',
        message: result.reason || 'No matching tables or columns found for your request.'
      });
    }

    // Error status
    console.error('[aiCustom/sql] ❌ Error generating SQL:', result.reason);
    return res.status(500).json({
      status: 'error',
      error: 'OPENAI_SQL_GENERATION_FAILED',
      message: result.reason || 'Failed to generate SQL for this request.'
    });
  } catch (error) {
    console.error('[aiCustom/sql] ❌ Unexpected error:', error.message);
    console.error('[aiCustom/sql] Stack:', error.stack);
    
    return res.status(500).json({
      status: 'error',
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while processing your request.'
    });
  }
});

/**
 * Helper function to execute a SQL query safely against the database
 * 
 * @param {string} sql - The SQL query to execute
 * @param {number} timeoutMs - Query timeout in milliseconds (default: 30000 = 30 seconds)
 * @returns {Promise<{columns: Array, rows: Array, rowCount: number}>}
 */
async function runAiCustomQuery(sql, timeoutMs = 30000) {
  const pool = getPool();
  const client = await pool.connect();
  
  let timeout;
  
  try {
    // Create a timeout promise
    const timeoutPromise = new Promise((_, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`Query timed out after ${timeoutMs / 1000} seconds`));
      }, timeoutMs);
    });

    // Execute the query with timeout
    const queryPromise = client.query(sql);
    const result = await Promise.race([queryPromise, timeoutPromise]);
    
    // Clear timeout if query completed
    if (timeout) {
      clearTimeout(timeout);
    }

    // Extract column metadata
    const columns = result.fields.map(field => ({
      name: field.name,
      dataType: field.dataType || null // pg library may not always provide dataType
    }));

    return {
      columns,
      rows: result.rows,
      rowCount: result.rowCount
    };
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
    client.release();
  }
}

/**
 * Validates queryText input
 * 
 * @param {any} queryText - The queryText from request body
 * @returns {{valid: boolean, error: string | null, trimmed: string | null}}
 */
function validateQueryText(queryText) {
  if (!queryText || typeof queryText !== 'string') {
    return {
      valid: false,
      error: 'queryText must be a non-empty string up to 1000 characters.',
      trimmed: null
    };
  }

  const trimmed = queryText.trim();

  if (trimmed.length === 0) {
    return {
      valid: false,
      error: 'queryText must be a non-empty string up to 1000 characters.',
      trimmed: null
    };
  }

  if (trimmed.length > 1000) {
    return {
      valid: false,
      error: 'queryText must not exceed 1000 characters.',
      trimmed: null
    };
  }

  return {
    valid: true,
    error: null,
    trimmed
  };
}

/**
 * POST /api/ai-custom/query-data
 * Generates SQL from natural language, validates it, executes it, and returns the results.
 * 
 * Request body:
 * {
 *   "queryText": string (required, 1-1000 characters)
 * }
 * 
 * Response (200 OK):
 * {
 *   "status": "ok" | "no_match" | "error",
 *   "sql": string | null,
 *   "reason": string,
 *   "rowCount": number,
 *   "columns": [{ name: string, dataType: string | null }],
 *   "rows": [{ ... }],
 *   "message"?: string (for no_match/error status)
 * }
 */
router.post('/query-data', async (req, res) => {
  try {
    // Check if service is available
    if (!aiCustomSqlService) {
      return res.status(503).json({
        status: 'error',
        error: 'SERVICE_UNAVAILABLE',
        message: 'AI Custom SQL service is not available. OPENAI_KEY may be missing.'
      });
    }

    // Validate request body
    const { queryText } = req.body || {};
    const validation = validateQueryText(queryText);

    if (!validation.valid) {
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_INPUT',
        message: validation.error
      });
    }

    const trimmedText = validation.trimmed;

    // Log request (truncated for privacy)
    console.log('[aiCustom/query-data] 📥 Request received, queryText length:', trimmedText.length);

    // Step 1: Generate SQL using OpenAI (reuse existing helper)
    const sqlResult = await aiCustomSqlService.generateSqlWithOpenAi(trimmedText);

    // Step 2: Handle SQL generation results
    if (sqlResult.status === 'no_match') {
      console.log('[aiCustom/query-data] ⚠️  No match found for user request');
      return res.status(200).json({
        status: 'no_match',
        message: sqlResult.reason || 'No matching tables or columns found for your request.'
      });
    }

    if (sqlResult.status === 'error') {
      console.error('[aiCustom/query-data] ❌ Error generating SQL:', sqlResult.reason);
      return res.status(500).json({
        status: 'error',
        error: 'OPENAI_SQL_GENERATION_FAILED',
        message: 'Failed to generate SQL for this request.'
      });
    }

    // Step 3: Validate SQL safety (status === 'ok' at this point)
    if (!sqlResult.sql || sqlResult.sql.trim().length === 0) {
      return res.status(500).json({
        status: 'error',
        error: 'INVALID_SQL',
        message: 'Generated SQL is empty.'
      });
    }

    const safetyCheck = validateSqlSafety(sqlResult.sql);
    if (!safetyCheck.valid) {
      console.error('[aiCustom/query-data] ❌ SQL safety check failed:', safetyCheck.error);
      console.log('[aiCustom/query-data] SQL (first 200 chars):', sqlResult.sql.substring(0, 200));
      return res.status(400).json({
        status: 'error',
        error: 'INVALID_SQL',
        message: 'The generated SQL was rejected by safety checks.'
      });
    }

    // Step 4: Add LIMIT if missing to prevent huge result sets
    const safeSql = addLimitIfMissing(sqlResult.sql, 5000);

    // Log SQL (truncated for debugging)
    console.log('[aiCustom/query-data] ✅ SQL validated, executing (first 200 chars):', safeSql.substring(0, 200));

    // Step 5: Execute query against database
    try {
      const queryResult = await runAiCustomQuery(safeSql, 30000); // 30 second timeout

      console.log('[aiCustom/query-data] ✅ Query executed successfully, rows:', queryResult.rowCount);

      // Step 6: Return successful response
      return res.status(200).json({
        status: 'ok',
        sql: safeSql,
        reason: sqlResult.reason,
        rowCount: queryResult.rowCount,
        columns: queryResult.columns,
        rows: queryResult.rows
      });
    } catch (dbError) {
      // Handle database errors
      console.error('[aiCustom/query-data] ❌ Database query failed:', dbError.message);
      console.error('[aiCustom/query-data] SQL (first 200 chars):', safeSql.substring(0, 200));
      
      // Check if it's a timeout
      if (dbError.message.includes('timeout')) {
        return res.status(500).json({
          status: 'error',
          error: 'DB_QUERY_FAILED',
          message: 'Query execution timed out. Please try a simpler query.'
        });
      }

      // Check if it's a SQL syntax error
      if (dbError.message.includes('syntax error') || dbError.message.includes('does not exist')) {
        return res.status(500).json({
          status: 'error',
          error: 'DB_QUERY_FAILED',
          message: 'Generated SQL query is invalid. Please try rephrasing your request.'
        });
      }

      return res.status(500).json({
        status: 'error',
        error: 'DB_QUERY_FAILED',
        message: 'Failed to execute the generated SQL query.'
      });
    }
  } catch (error) {
    console.error('[aiCustom/query-data] ❌ Unexpected error:', error.message);
    console.error('[aiCustom/query-data] Stack:', error.stack);
    
    return res.status(500).json({
      status: 'error',
      error: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred while processing your request.'
    });
  }
});

export default router;

