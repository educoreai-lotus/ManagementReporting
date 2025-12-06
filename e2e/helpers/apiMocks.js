/**
 * API Mocking Helpers for E2E Tests
 * 
 * Provides reusable mock responses for backend API endpoints
 */

/**
 * Mock dashboard API response
 */
export const mockDashboardResponse = {
  charts: [
    {
      id: 'chart-1',
      title: 'Course Completion Rate',
      type: 'bar',
      data: [
        { name: 'Jan', value: 75 },
        { name: 'Feb', value: 82 },
        { name: 'Mar', value: 88 }
      ],
      metadata: {
        xAxisLabel: 'Month',
        yAxisLabel: 'Completion %'
      }
    },
    {
      id: 'chart-2',
      title: 'User Engagement',
      type: 'line',
      data: [
        { name: 'Week 1', value: 120 },
        { name: 'Week 2', value: 135 },
        { name: 'Week 3', value: 150 }
      ]
    }
  ],
  lastUpdated: new Date().toISOString()
};

/**
 * Mock all charts API response
 */
export const mockAllChartsResponse = {
  charts: [
    ...mockDashboardResponse.charts,
    {
      id: 'chart-3',
      title: 'Additional Chart',
      type: 'pie',
      data: [
        { name: 'A', value: 30 },
        { name: 'B', value: 40 },
        { name: 'C', value: 30 }
      ]
    }
  ]
};

/**
 * Mock report types API response
 */
export const mockReportTypesResponse = {
  reportTypes: [
    {
      id: 'monthly-performance',
      name: 'Monthly Learning Performance Report',
      description: 'Comprehensive monthly analysis of learning outcomes'
    },
    {
      id: 'course-completion',
      name: 'Course Completion Analysis',
      description: 'Detailed breakdown of course participation'
    },
    {
      id: 'user-engagement',
      name: 'User Engagement Summary',
      description: 'Analysis of user engagement patterns'
    }
  ]
};

/**
 * Mock report generation response
 */
export const mockReportResponse = {
  reportId: 'report-123',
  type: 'monthly-performance',
  generatedAt: new Date().toISOString(),
  charts: [
    {
      id: 'report-chart-1',
      title: 'Performance Metrics',
      type: 'bar',
      data: [{ name: 'Metric 1', value: 85 }]
    }
  ],
  executiveSummary: {
    title: 'Monthly Performance Summary',
    keyFindings: ['Finding 1', 'Finding 2']
  },
  aiInsights: {
    insights: 'AI-generated insights about the data'
  }
};

/**
 * Mock chart transcription API response
 */
export const mockTranscriptionResponse = {
  chartId: 'chart-1',
  transcription_text: 'This chart shows the course completion rate over time, with a steady increase from January to March.',
  chart_signature: 'signature-123',
  model: 'gpt-4o-mini',
  updated_at: new Date().toISOString()
};

/**
 * Mock AI narration response
 */
export const mockNarrationResponse = {
  narration: 'This chart displays a clear upward trend in course completion rates, indicating improved learner engagement and course effectiveness over the observed period.',
  generatedAt: new Date().toISOString()
};

/**
 * Mock chart detail API response
 */
export const mockChartDetailResponse = {
  id: 'chart-1',
  title: 'Course Completion Rate',
  type: 'bar',
  data: [
    { name: 'Jan', value: 75 },
    { name: 'Feb', value: 82 },
    { name: 'Mar', value: 88 }
  ],
  metadata: {
    description: 'Monthly course completion statistics'
  }
};

/**
 * Setup common API mocks for a page
 * @param {Page} page - Playwright page object
 */
export async function setupCommonMocks(page) {
  // Mock dashboard API
  await page.route('**/api/v1/dashboard', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockDashboardResponse),
    });
  });

  // Mock all charts API
  await page.route('**/api/v1/dashboard/all-charts', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockAllChartsResponse),
    });
  });

  // Mock report types API
  await page.route('**/api/v1/reports/types', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockReportTypesResponse),
    });
  });
}

/**
 * Setup report generation mocks
 * @param {Page} page - Playwright page object
 */
export async function setupReportMocks(page) {
  await setupCommonMocks(page);

  // Mock report generation API
  await page.route('**/api/v1/reports/generate', async (route) => {
    const request = route.request();
    const postData = request.postDataJSON();
    
    if (postData?.format === 'pdf') {
      // Return blob for PDF
      await route.fulfill({
        status: 200,
        contentType: 'application/pdf',
        body: Buffer.from('mock-pdf-content'),
      });
    } else {
      // Return JSON for preview
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockReportResponse),
      });
    }
  });
}

/**
 * Setup AI transcription mocks
 * @param {Page} page - Playwright page object
 */
export async function setupTranscriptionMocks(page) {
  await setupCommonMocks(page);

  // Mock chart transcription API
  await page.route('**/api/v1/ai/chart-transcription/**', async (route) => {
    const url = route.request().url();
    
    if (route.request().method() === 'GET') {
      // GET transcription
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            exists: true,
            transcription_text: mockTranscriptionResponse.transcription_text,
            chartId: 'chart-1'
          }
        }),
      });
    } else if (route.request().method() === 'POST') {
      // POST transcription (create/update)
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(mockTranscriptionResponse),
      });
    }
  });
}

/**
 * Setup AI narration mocks
 * @param {Page} page - Playwright page object
 */
export async function setupNarrationMocks(page) {
  await setupCommonMocks(page);

  // Mock OpenAI narration API
  await page.route('**/api/v1/openai/report-conclusions', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(mockNarrationResponse),
    });
  });
}

