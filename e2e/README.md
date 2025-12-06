# E2E Tests with Playwright

Complete end-to-end test suite for the Management Reporting Microservice frontend.

## Test Suite Overview

This E2E test suite covers all major user flows:

- ✅ **Dashboard** - Loading, chart rendering, navigation
- ✅ **Reports** - List, generation, display
- ✅ **Charts** - Rendering, detail pages, interactions
- ✅ **PDF Generation** - Download flow, UI states
- ✅ **AI Transcription** - Chart transcription flow
- ✅ **AI Narration** - Report narration generation
- ✅ **Preferences** - Theme toggle, persistence

**Total:** 41 comprehensive E2E tests

## Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Install Playwright browsers:**
```bash
npx playwright install
```

## Running Tests

### Run all E2E tests:
```bash
npm run test:e2e
```

### Run tests with UI mode:
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (see browser):
```bash
npx playwright test --headed
```

### Run a specific test file:
```bash
npx playwright test e2e/tests/dashboard.spec.js
```

### Run tests matching a pattern:
```bash
npx playwright test --grep "dashboard"
```

## Prerequisites

Before running E2E tests, ensure:

1. **Frontend dev server is running:**
   ```bash
   cd frontend
   npm run dev
   ```
   The server should be running on `http://localhost:5173`

2. **Backend API is NOT required:**
   - All API calls are mocked via route interception
   - Tests run independently of backend availability

## Test Structure

```
e2e/
├── tests/              # Test files
│   ├── dashboard.spec.js
│   ├── reports.spec.js
│   ├── charts.spec.js
│   ├── pdf.spec.js
│   ├── ai-transcription.spec.js
│   ├── ai-narration.spec.js
│   ├── preferences.spec.js
│   └── example.spec.js
├── helpers/            # Test utilities
│   ├── testUtils.js    # Common helper functions
│   └── apiMocks.js     # API mocking helpers
├── fixtures/           # Test data
│   ├── testUser.json
│   ├── mockReports.json
│   └── mockCharts.json
├── README.md           # This file
└── TEST_FLOWS_SUMMARY.md  # Detailed flow documentation
```

## Configuration

Playwright configuration is in `playwright.config.js` at the project root.

Key settings:
- **baseURL**: `http://localhost:5173` (frontend dev server)
- **retries**: 1 (retry failed tests once)
- **reporter**: HTML (generates HTML report)
- **browser**: Chromium only (for now)
- **timeout**: 30 seconds per test

## Test Files

### Dashboard Tests (`dashboard.spec.js`)
- Dashboard loading
- Chart rendering
- Empty/error states
- Navigation

### Reports Tests (`reports.spec.js`)
- Report list display
- Report generation
- Report content display
- Error handling

### Charts Tests (`charts.spec.js`)
- Chart rendering
- Chart detail pages
- Data tables
- Loading/error states

### PDF Tests (`pdf.spec.js`)
- PDF download flow
- Loading states
- Error handling
- Success states

### AI Transcription Tests (`ai-transcription.spec.js`)
- Transcription display
- API calls
- Loading states
- Error handling

### AI Narration Tests (`ai-narration.spec.js`)
- Narration generation
- API calls
- Loading states
- Error handling

### Preferences Tests (`preferences.spec.js`)
- Theme toggle
- Preference persistence
- Cross-page persistence
- UI updates

## Mocking API Responses

All API calls are mocked using helpers from `e2e/helpers/apiMocks.js`:

```javascript
import { setupCommonMocks } from '../helpers/apiMocks.js';

test.beforeEach(async ({ page }) => {
  await setupCommonMocks(page);
});
```

Or mock specific endpoints:

```javascript
await page.route('**/api/v1/dashboard', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ charts: [] }),
  });
});
```

## Test Reports

After running tests, view the HTML report:

```bash
npx playwright show-report
```

The report includes:
- Test results and status
- Screenshots of failures
- Execution traces
- Performance metrics

## Writing New Tests

1. **Create test file** in `e2e/tests/`
2. **Import helpers:**
   ```javascript
   import { setupCommonMocks } from '../helpers/apiMocks.js';
   import { waitForReactRender } from '../helpers/testUtils.js';
   ```
3. **Setup mocks** in `beforeEach`
4. **Write tests** using Playwright API
5. **Use helpers** for common operations

Example:
```javascript
import { test, expect } from '@playwright/test';
import { setupCommonMocks } from '../helpers/apiMocks.js';

test.describe('My Feature', () => {
  test.beforeEach(async ({ page }) => {
    await setupCommonMocks(page);
  });

  test('should do something', async ({ page }) => {
    await page.goto('/my-page');
    // Test code here
  });
});
```

## Notes

- ✅ All tests are fully isolated
- ✅ Each test runs in a clean browser context
- ✅ Screenshots captured on failure
- ✅ Traces collected for failed tests (on retry)
- ✅ All API calls are mocked - no backend required
- ✅ Tests are deterministic and CI-friendly

## Troubleshooting

### Tests fail with timeout
- Ensure frontend dev server is running on `http://localhost:5173`
- Check network tab for failed API calls
- Increase timeout in test if needed

### Elements not found
- Use Playwright's codegen to find selectors: `npx playwright codegen`
- Check if element is in shadow DOM
- Wait for React to finish rendering

### API mocks not working
- Verify route pattern matches actual API URL
- Check network tab to see actual requests
- Ensure mock is set up before navigation

## Documentation

For detailed flow documentation, see:
- **`TEST_FLOWS_SUMMARY.md`** - Complete flow descriptions
- **`E2E_SETUP_SUMMARY.md`** - Setup documentation (root level)

