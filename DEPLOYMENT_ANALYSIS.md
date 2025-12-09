# Deployment Setup Analysis

## Phase 1: Current Deployment Setup Analysis

### Files Found

1. **Frontend Vercel Config:**
   - `frontend/vercel.json` - Exists, contains rewrite rules for SPA routing
   - Frontend build output: `frontend/dist/` (from vite.config.js)

2. **Backend Railway Config:**
   - `backend/railway.json` - Exists, uses Dockerfile builder
   - `railway.json` (root) - Exists, uses Nixpacks builder
   - `backend/Dockerfile` - Exists

3. **Existing Workflows:**
   - `.github/workflows/ci.yml` - CI only, no deployment
   - No `deploy.yml` workflow exists

4. **Documentation:**
   - `DEPLOYMENT.md` - Contains manual deployment instructions
   - References secrets: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `RAILWAY_TOKEN`

### Current Deployment Method

**Frontend (Vercel):**
- Currently deployed manually via Vercel dashboard or CLI
- Uses `frontend/` as root directory
- Build command: `npm run build`
- Output: `dist/`

**Backend (Railway):**
- Currently deployed manually via Railway dashboard or CLI
- Uses `backend/` directory
- Uses Dockerfile or Nixpacks
- Start command: `npm start`

### Secrets Required (from DEPLOYMENT.md)

**Vercel:**
- `VERCEL_TOKEN` - Vercel API token
- `VERCEL_ORG_ID` - Vercel organization ID
- `VERCEL_PROJECT_ID` - Vercel project ID

**Railway:**
- `RAILWAY_TOKEN` - Railway API token

### Current CI Workflow

- Runs on: `pull_request` and `push` to all branches
- Jobs: `frontend_ci`, `backend_ci`, `e2e_tests`
- No deployment jobs exist
- No branch filtering for deployment

---

## Phase 2: Automatic CD Flow Design

### Deployment Strategy

**Frontend (Vercel):**
- Use Vercel CLI with `vercel --prod` command
- Deploy from `frontend/` directory
- Use `VERCEL_TOKEN` from secrets
- Auto-detect project (no hardcoded IDs needed if project linked)
- Only deploy on `main` branch
- Only if all CI tests pass

**Backend (Railway):**
- Use Railway CLI with `railway up` or `railway deploy`
- Deploy from `backend/` directory
- Use `RAILWAY_TOKEN` from secrets
- Only deploy on `main` branch
- Only if all CI tests pass

### Job Dependencies

```
CI Jobs (must all pass):
├── frontend_ci
├── backend_ci
└── e2e_tests (depends on frontend_ci)

Deployment Jobs (run only if CI passes AND branch is main):
├── deploy_frontend (depends on: frontend_ci, backend_ci, e2e_tests)
└── deploy_backend (depends on: frontend_ci, backend_ci, e2e_tests)
```

### Branch Filtering

- Deployment jobs only run on `main` branch
- Use `if: github.ref == 'refs/heads/main'` condition
- CI jobs run on all branches (current behavior)

---

## Phase 3: Implementation Plan

### Changes to `.github/workflows/ci.yml`

1. **Add branch filter to workflow trigger:**
   - Keep current triggers (PR and push to all branches)
   - Add conditional logic in deployment jobs

2. **Add `deploy_frontend` job:**
   - Condition: `github.ref == 'refs/heads/main' && needs.frontend_ci == 'success' && needs.backend_ci == 'success' && needs.e2e_tests == 'success'`
   - Install Vercel CLI
   - Deploy using `vercel --prod --token ${{ secrets.VERCEL_TOKEN }}`
   - Working directory: `frontend/`

3. **Add `deploy_backend` job:**
   - Condition: `github.ref == 'refs/heads/main' && needs.frontend_ci == 'success' && needs.backend_ci == 'success' && needs.e2e_tests == 'success'`
   - Install Railway CLI
   - Deploy using `railway up` or `railway deploy`
   - Working directory: `backend/`
   - Use `RAILWAY_TOKEN` from secrets

### Safety Considerations

✅ **Safe:**
- Only adds deployment jobs (doesn't modify CI jobs)
- Uses branch filtering (only main)
- Requires all CI tests to pass
- Uses existing secrets (no new secrets required)
- Doesn't modify production code
- Doesn't change build processes

⚠️ **Notes:**
- Secrets must be configured in GitHub before first deployment
- Vercel project must be linked to repository (or use project ID)
- Railway service must be linked to repository (or use service ID)

---

## Required Secrets

### Must be configured in GitHub → Settings → Secrets → Actions

1. **VERCEL_TOKEN** - Vercel API token
   - Generate at: https://vercel.com/account/tokens
   - Required for: Frontend deployment

2. **RAILWAY_TOKEN** - Railway API token
   - Generate at: https://railway.app/account/tokens
   - Required for: Backend deployment

3. **VERCEL_ORG_ID** (optional) - Only if project not auto-detected
4. **VERCEL_PROJECT_ID** (optional) - Only if project not auto-detected

---

## Testing Strategy

### Safe Testing Without Breaking Production

1. **Test on feature branch:**
   - Create a feature branch
   - Push changes
   - CI runs, but deployment jobs skip (not main branch)
   - Verify CI passes

2. **Test deployment on main (if safe):**
   - Merge to main
   - CI runs
   - Deployment jobs run
   - Monitor deployment logs
   - Can rollback if needed

3. **Dry-run locally:**
   - Test Vercel CLI: `cd frontend && vercel --prod --token $VERCEL_TOKEN`
   - Test Railway CLI: `cd backend && railway up`

---

## Implementation Status

- ✅ Analysis complete
- ✅ Design complete
- ⏳ Implementation pending
- ⏳ Testing pending


