# E2E Test Flows Summary

This document describes all E2E test flows implemented in the Playwright test suite.

## Test Files Overview

### 1. `dashboard.spec.js`
**Purpose:** Tests dashboard loading and basic functionality

**Flows Covered:**
- ✅ Dashboard page loads successfully
- ✅ Dashboard header/navigation displays
- ✅ Charts render on dashboard
- ✅ Empty state handling (no data)
- ✅ Error state handling (API errors)
- ✅ Navigation to reports page

**Key Assertions:**
- Page URL contains `/dashboard`
- Chart containers are present
- Error/empty states display correctly

---

### 2. `reports.spec.js`
**Purpose:** Tests report list, generation, and display

**Flows Covered:**
- ✅ Reports page loads
- ✅ Report types list displays
- ✅ Report generation UI opens
- ✅ Report content displays after generation
- ✅ Report generation error handling
- ✅ Report metadata display

**Key Assertions:**
- Report types are visible
- Report generation triggers API call
- Report content (charts, summary) appears
- Error messages display on failure

---

### 3. `charts.spec.js`
**Purpose:** Tests chart rendering and chart detail pages

**Flows Covered:**
- ✅ Charts render on dashboard
- ✅ Chart titles display
- ✅ Navigation to chart detail page
- ✅ Chart detail page displays
- ✅ Chart data table displays
- ✅ Chart loading state
- ✅ Chart error state

**Key Assertions:**
- Chart containers are visible
- Chart detail page loads
- Chart visualizations render
- Data tables appear

---

### 4. `pdf.spec.js`
**Purpose:** Tests PDF generation and download flow

**Flows Covered:**
- ✅ PDF download triggered from report
- ✅ Loading state during PDF generation
- ✅ PDF generation error handling
- ✅ Success state after PDF generation

**Key Assertions:**
- Download button triggers PDF API call
- Loading indicators appear
- Error messages display on failure
- Report content displays on success

**Note:** PDF generation is mocked - no actual PDF files are created.

---

### 5. `ai-transcription.spec.js`
**Purpose:** Tests AI chart transcription flow

**Flows Covered:**
- ✅ Transcription displays for chart
- ✅ Transcription API call triggered
- ✅ Loading state during transcription
- ✅ Transcription error handling
- ✅ Missing transcription handling
- ✅ Transcription refresh/update

**Key Assertions:**
- Transcription text appears
- API calls are made correctly
- Error states handled gracefully
- Chart still displays without transcription

**Note:** All AI API calls are mocked via route interception.

---

### 6. `ai-narration.spec.js`
**Purpose:** Tests AI narration generation for reports

**Flows Covered:**
- ✅ Narration generated for report
- ✅ Narration API call triggered
- ✅ Loading state during narration
- ✅ Narration error handling
- ✅ Narration text displays in report
- ✅ Empty narration response handling

**Key Assertions:**
- Narration section appears
- API calls are made correctly
- Loading indicators show
- Report still displays if narration fails

**Note:** All AI API calls are mocked via route interception.

---

### 7. `preferences.spec.js`
**Purpose:** Tests user preferences (theme, etc.)

**Flows Covered:**
- ✅ Theme toggle (light to dark)
- ✅ Theme toggle (dark to light)
- ✅ Theme preference persists in localStorage
- ✅ Saved theme loads on page load
- ✅ Theme maintained across navigation
- ✅ UI updates when theme changes

**Key Assertions:**
- `dark` class toggles on HTML element
- localStorage stores preference
- Theme persists across page loads
- UI elements update with theme

---

## Test Execution Flow

### Setup Phase
1. **Before Each Test:**
   - API mocks are set up via `setupCommonMocks()` or specific mock functions
   - localStorage is cleared (for preference tests)
   - Page navigates to target route

### Test Execution
1. **Navigation:**
   - Page navigates to route (e.g., `/dashboard`, `/reports`)
   - Waits for network idle and React render

2. **Interaction:**
   - User actions simulated (clicks, navigation)
   - API calls intercepted and mocked
   - UI updates awaited

3. **Verification:**
   - Elements checked for visibility
   - URLs verified
   - API calls tracked
   - State changes validated

### Cleanup
- Mocks are automatically cleared between tests
- No persistent state between tests

## Mocking Strategy

### API Mocking
All backend API calls are mocked using Playwright's `page.route()`:

```javascript
await page.route('**/api/v1/dashboard', async (route) => {
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(mockData),
  });
});
```

### Mock Data Sources
- **`e2e/helpers/apiMocks.js`** - Reusable mock response functions
- **`e2e/fixtures/mockReports.json`** - Report data fixtures
- **`e2e/fixtures/mockCharts.json`** - Chart data fixtures

## Test Coverage Summary

| Flow Category | Tests | Status |
|--------------|-------|--------|
| Dashboard Loading | 6 tests | ✅ Complete |
| Reports | 6 tests | ✅ Complete |
| Charts | 7 tests | ✅ Complete |
| PDF Generation | 4 tests | ✅ Complete |
| AI Transcription | 6 tests | ✅ Complete |
| AI Narration | 6 tests | ✅ Complete |
| Preferences | 6 tests | ✅ Complete |
| **Total** | **41 tests** | ✅ Complete |

## Running Tests

### Run All Tests
```bash
npm run test:e2e
```

### Run Specific Test File
```bash
npx playwright test e2e/tests/dashboard.spec.js
```

### Run with UI
```bash
npm run test:e2e:ui
```

### Run in Headed Mode
```bash
npx playwright test --headed
```

## Prerequisites

1. **Frontend dev server running:**
   ```bash
   cd frontend
   npm run dev
   ```

2. **Playwright browsers installed:**
   ```bash
   npx playwright install
   ```

## Notes

- All tests use mocked API responses - no real backend required
- Tests are deterministic and CI-friendly
- Screenshots captured on failure
- Traces collected for failed tests (on retry)
- All tests run in isolated browser contexts

## Future Enhancements

Potential additions (not implemented):
- Visual regression tests
- Performance testing
- Accessibility testing
- Cross-browser testing (currently Chromium only)
- Mobile viewport testing


