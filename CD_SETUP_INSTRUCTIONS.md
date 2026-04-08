# Automatic CI/CD Deployment Setup Instructions

## ✅ Deployment Jobs Added

Two deployment jobs have been added to `.github/workflows/ci.yml`:

1. **`deploy_frontend`** - Deploys frontend to Vercel
2. **`deploy_backend`** - Deploys backend to Railway

---

## 🔒 Required Secrets Configuration

### Step 1: Configure GitHub Secrets

Go to: **GitHub Repository → Settings → Secrets and variables → Actions**

#### Add Vercel Secrets

1. **VERCEL_TOKEN** (Required)
   - Get from: https://vercel.com/account/tokens
   - Click "Create Token"
   - Name: "GitHub Actions Deployment"
   - Copy the token
   - Add to GitHub Secrets as `VERCEL_TOKEN`

2. **VERCEL_ORG_ID** (Optional - only if project not auto-detected)
   - Get from: Vercel project settings
   - Or run: `vercel whoami` locally
   - Add to GitHub Secrets as `VERCEL_ORG_ID`

3. **VERCEL_PROJECT_ID** (Optional - only if project not auto-detected)
   - Get from: Vercel project settings
   - Add to GitHub Secrets as `VERCEL_PROJECT_ID`

#### Add Railway Secrets

1. **RAILWAY_TOKEN** (Required)
   - Get from: https://railway.app/account/tokens
   - Click "New Token"
   - Name: "GitHub Actions Deployment"
   - Copy the token
   - Add to GitHub Secrets as `RAILWAY_TOKEN`

2. **RAILWAY_SERVICE_ID** (Optional - only if service not auto-detected)
   - Get from: Railway service settings
   - Or run: `railway status` locally
   - Add to GitHub Secrets as `RAILWAY_SERVICE_ID`

---

## 🔗 Link Projects to GitHub (Recommended)

### Link Vercel Project

1. Go to Vercel Dashboard
2. Select your project
3. Go to Settings → Git
4. Connect to GitHub repository
5. This enables auto-detection of project in CI/CD

### Link Railway Service

1. Go to Railway Dashboard
2. Select your service
3. Go to Settings → Source
4. Connect to GitHub repository
5. This enables auto-detection of service in CI/CD

---

## 🚀 How Deployment Works

### Automatic Deployment Flow

```
Push to main branch
    ↓
CI Tests Run:
  ├── frontend_ci (build + tests)
  ├── backend_ci (tests)
  └── e2e_tests (E2E tests)
    ↓
If ALL tests pass:
  ├── deploy_frontend → Vercel
  └── deploy_backend → Railway
    ↓
Deployment Complete ✅
```

### Branch Protection

- ✅ **Main branch:** CI runs → Deployment runs (if tests pass)
- ✅ **Other branches:** CI runs → Deployment skipped
- ✅ **Pull requests:** CI runs → Deployment skipped

---

## 🧪 Testing Without Breaking Production

### Safe Testing Method

1. **Create a feature branch:**
   ```bash
   git checkout -b test-deployment
   ```

2. **Make a small change:**
   ```bash
   echo "# Test" >> README.md
   git add README.md
   git commit -m "Test deployment workflow"
   git push origin test-deployment
   ```

3. **Verify CI runs:**
   - Go to GitHub → Actions
   - Verify CI jobs run
   - Verify deployment jobs are **skipped** (not main branch)

4. **Merge to main when ready:**
   ```bash
   git checkout main
   git merge test-deployment
   git push origin main
   ```

5. **Monitor deployment:**
   - Go to GitHub → Actions
   - Verify all CI jobs pass
   - Verify deployment jobs run
   - Check Vercel and Railway dashboards

---

## ✅ Verification Checklist

Before first deployment:

- [ ] `VERCEL_TOKEN` added to GitHub Secrets
- [ ] `RAILWAY_TOKEN` added to GitHub Secrets
- [ ] Vercel project linked to GitHub (or IDs set)
- [ ] Railway service linked to GitHub (or service ID set)
- [ ] CI tests pass on a test branch
- [ ] Ready to deploy to production

---

## 📊 Monitoring Deployments

### GitHub Actions

1. Go to: **GitHub → Actions tab**
2. Click on the latest workflow run
3. View job logs:
   - `frontend_ci` - Frontend build and tests
   - `backend_ci` - Backend tests
   - `e2e_tests` - E2E tests
   - `deploy_frontend` - Vercel deployment
   - `deploy_backend` - Railway deployment

### Vercel Dashboard

1. Go to: **Vercel Dashboard**
2. Select your project
3. View deployments
4. Check build logs
5. Verify deployment URL

### Railway Dashboard

1. Go to: **Railway Dashboard**
2. Select your service
3. View deployments
4. Check logs
5. Verify service URL

---

## 🐛 Troubleshooting

### Deployment Jobs Don't Run

**Check:**
- Are you on `main` branch? (Deployments only run on main)
- Did all CI tests pass? (Deployments require all tests to pass)
- Are secrets configured? (Check GitHub Settings → Secrets)

### Vercel Deployment Fails

**Check:**
- Is `VERCEL_TOKEN` set correctly?
- Is project linked to GitHub? (Or are IDs set?)
- Does build succeed locally? (`cd frontend && npm run build`)

**Solution:**
```bash
# Test locally
cd frontend
npm ci
npm run build
vercel --prod --token $VERCEL_TOKEN
```

### Railway Deployment Fails

**Check:**
- Is `RAILWAY_TOKEN` set correctly?
- Is service linked to GitHub? (Or is service ID set?)
- Does `railway.json` exist in `backend/`?

**Solution:**
```bash
# Test locally
cd backend
railway login --token $RAILWAY_TOKEN
railway up
```

---

## 📝 Summary

✅ **Deployment jobs added**
✅ **Only deploy on main branch**
✅ **Only deploy if all tests pass**
✅ **Secrets required: VERCEL_TOKEN, RAILWAY_TOKEN**
✅ **Optional secrets: VERCEL_ORG_ID, VERCEL_PROJECT_ID, RAILWAY_SERVICE_ID**
✅ **No production code modified**
✅ **Ready to use after secrets are configured**

---

## 🎯 Next Steps

1. **Configure secrets** in GitHub Settings
2. **Link projects** to GitHub (recommended)
3. **Test on feature branch** (verify CI works)
4. **Push to main** (trigger deployment)
5. **Monitor** deployments in dashboards

---

**Status: Ready for use after secrets configuration**



