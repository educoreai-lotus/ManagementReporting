/**
 * Integration tests for Health endpoints
 * 
 * Tests the health check API endpoints.
 */

import request from 'supertest';
import express from 'express';
import healthRoutes from '../../src/presentation/routes/health.js';

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/health', healthRoutes);

describe('Health API', () => {
  describe('GET /api/v1/health/db', () => {
    test('should return health status', async () => {
      // Note: This will actually call the database health check
      // In a real scenario, you might want to mock the healthCheck function
      const response = await request(app)
        .get('/api/v1/health/db')
        .expect(200);
      
      expect(response.body).toHaveProperty('ok');
      // The actual result depends on database connection
      // This test verifies the endpoint structure and response format
    });
  });
});


