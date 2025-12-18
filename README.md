# EducoreAI Management Reporting Microservice

A unified management reporting and analytics platform that aggregates data from multiple EducoreAI microservices, providing system administrators with real-time insights, interactive dashboards, and AI-enhanced analytical reports.

## Project Structure

```
lotus_project/
├── frontend/          # React.js + Vite frontend application
├── backend/           # Node.js + Express backend (Onion Architecture)
├── DB/                # Redis cache configuration and utilities
└── [documentation]    # Project documentation files
```

## Technology Stack

### Frontend
- **Framework:** React.js with Vite
- **Styling:** TailwindCSS
- **Charts:** Chart.js / Recharts
- **Deployment:** Vercel

### Backend
- **Runtime:** Node.js
- **Framework:** Express.js
- **Architecture:** Onion Architecture (Domain, Application, Infrastructure, Presentation)
- **Deployment:** Railway

### Cache
- **Technology:** Redis (Cloud-managed)
- **Configuration:** DB folder

## Features

1. **Main Dashboard** - Interactive charts with 6-8 primary metrics
2. **BOX (Additional Charts)** - 10-15 additional charts in collapsible sidebar
3. **Reports System** - 8 report types with PDF export
4. **AI Integration** - GPT-4-Turbo insights in reports
5. **Data Collection** - Automated daily collection from 5 microservices
6. **Cache Management** - Redis-based 60-day rolling data window
7. **User Interface** - Responsive design with Light/Dark themes
8. **Security** - JWT authentication, role-based access control

## Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Redis instance (local or cloud)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd lotus_project
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
npm install
```

4. **Set up Environment Variables**
- Copy `.env.example` files in frontend and backend
- Configure Redis connection in `DB/` folder
- Set up API keys and microservice URLs

5. **Run Development Servers**

Frontend:
```bash
cd frontend
npm run dev
```

Backend:
```bash
cd backend
npm run dev
```

## Development

### Frontend Development
- Development server: `http://localhost:5173`
- Build: `npm run build`
- Test: `npm run test`

### Backend Development
- Development server: `http://localhost:3000`
- Test: `npm run test`
- API Documentation: `http://localhost:3000/api-docs`

## Deployment

This project uses GitHub Actions for automated CI/CD. See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete setup instructions.

### Quick Overview

**CI/CD Pipeline:**
- **CI** (`.github/workflows/ci.yml`): Runs on every PR/push - lints, builds, tests
- **Deploy** (`.github/workflows/deploy.yml`): Runs on push to `main` - deploys to Vercel & Railway with manual approval

**Frontend (Vercel):**
- Automatic deployment via GitHub Actions
- Requires: `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` secrets
- Environment variables configured in Vercel dashboard
- Build command: `npm run build`
- Output directory: `dist`

**Backend (Railway):**
- Automatic deployment via GitHub Actions
- Requires: `RAILWAY_TOKEN` secret
- Environment variables configured in Railway dashboard
- Root directory: `backend`
- Start command: `npm start`
- Health check: `/health` endpoint

**Manual Setup Required:**
1. Set up Vercel project and get credentials
2. Set up Railway project and get token
3. Add secrets to GitHub repository
4. Create GitHub Environments (`production-frontend`, `production-backend`) with required reviewers

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed step-by-step instructions.

## Documentation

- **Project Overview:** `Project_Overview.md`
- **Requirements:** `Requirements_Specification.md`
- **Architecture:** `System_Data_Architecture.md`
- **Test Strategy:** `Test_Strategy.md`
- **User Stories:** `User_Stories.md`

## License

Proprietary - EducoreAI

<!-- Updated: December 18, 2025 -->

