# רשימת טכנולוגיות בפרויקט Lotus

## 🎯 Backend Technologies

### Runtime & Language
- **Node.js** - v20.x (>=18.0.0)
- **JavaScript (ESM)** - ES Modules (type: "module")

### Web Framework & HTTP
- **Express.js** - v4.18.2 (Web framework)
- **CORS** - v2.8.5 (Cross-Origin Resource Sharing)
- **express-rate-limit** - v7.1.5 (Rate limiting middleware)
- **express-validator** - v7.0.1 (Input validation)

### Database
- **PostgreSQL** - Database system (via `pg` v8.12.0)
- **pg-cron** - PostgreSQL extension for scheduled jobs
- **Supabase** - @supabase/supabase-js v2.39.3 (PostgreSQL hosting/management)

### Caching & Storage
- **Redis** - v4.6.11 (In-memory data store - optional, currently using DB-backed mode)

### AI & Machine Learning
- **OpenAI API** - v4.20.1
  - **gpt-4o** - For SQL generation and report conclusions
  - **gpt-4o-mini** - For chart transcriptions (cost-effective)
  - **Vision API** - For image-based chart analysis

### PDF Generation
- **PDFKit** - v0.17.2 (PDF document generation)

### Authentication & Security
- **jsonwebtoken** - v9.0.2 (JWT tokens)
- **dotenv** - v16.3.1 (Environment variables)

### HTTP Client
- **axios** - v1.6.2 (HTTP client for microservices)
- **qs** - v6.12.0 (Query string parsing)

### Scheduling
- **node-cron** - v3.0.3 (Cron job scheduling)

### Development Tools
- **nodemon** - v3.0.2 (Auto-restart on file changes)
- **Jest** - v29.7.0 (Testing framework)
- **supertest** - v6.3.3 (HTTP assertion testing)
- **@types/jest** - v29.5.8 (TypeScript types for Jest)

### Containerization
- **Docker** - Container platform
- **Node.js 20-slim** - Docker base image

---

## 🎨 Frontend Technologies

### Framework & Library
- **React** - v18.2.0 (UI framework)
- **React DOM** - v18.2.0 (React rendering)
- **React Router DOM** - v6.20.0 (Client-side routing)

### Build Tools
- **Vite** - v5.0.8 (Build tool and dev server)
- **@vitejs/plugin-react** - v4.2.1 (Vite React plugin)

### Styling
- **Tailwind CSS** - v3.3.6 (Utility-first CSS framework)
- **PostCSS** - v8.4.32 (CSS processing)
- **Autoprefixer** - v10.4.16 (CSS vendor prefixing)

### Charts & Visualization
- **Recharts** - v2.10.3 (React charting library)
  - Bar charts
  - Line charts
  - Pie charts
  - Area charts
  - Multi-series charts

### Icons
- **Lucide React** - v0.294.0 (Icon library)

### Utilities
- **html2canvas** - v1.4.1 (DOM to canvas/image conversion)
- **axios** - v1.6.2 (HTTP client)

### Browser APIs
- **Web Speech API** - Speech-to-text dictation
  - SpeechRecognition
  - webkitSpeechRecognition

### TypeScript Types
- **@types/react** - v18.2.43
- **@types/react-dom** - v18.2.17

---

## 🗄️ Database Technologies

### Database System
- **PostgreSQL** - Relational database
  - Extensions: pg_cron
  - Data types: BIGSERIAL, UUID, JSONB, TEXT, INT, NUMERIC, DATE, TIMESTAMPTZ, BOOLEAN
  - Features: CHECK constraints, FOREIGN KEY, ON DELETE CASCADE, ENUM types

### Database Schema
- Normalized tables structure
- Snapshot-based analytics
- Cache tables for microservices data
- AI-related tables (chart transcriptions, report conclusions)

---

## 🔧 DevOps & CI/CD

### Version Control
- **Git** - Version control system
- **GitHub** - Repository hosting

### CI/CD
- **GitHub Actions** - CI/CD platform
  - **actions/checkout@v4** - Checkout code
  - **actions/setup-node@v4** - Node.js setup
  - **actions/upload-artifact@v4** - Artifact upload

### Deployment Platforms
- **Railway** - Backend deployment (optional)
- **Vercel** - Frontend deployment (optional)

### Operating System
- **Ubuntu Latest** - CI/CD runner OS

---

## 📦 Package Management

### Package Managers
- **npm** - Node Package Manager
  - npm ci (clean install)
  - npm install
  - npm start
  - npm run dev
  - npm test

---

## 🔐 Security & Authentication

### Security Libraries
- **express-rate-limit** - API rate limiting
- **express-validator** - Input validation
- **jsonwebtoken** - JWT authentication
- **CORS** - Cross-origin resource sharing

---

## 📊 Data Processing

### Data Formats
- **JSON** - Data interchange format
- **JSONB** - PostgreSQL JSON binary format
- **Base64** - Image encoding (for OpenAI Vision API)

### Data Validation
- Custom validation services
- Schema validation
- Type checking

---

## 🌐 APIs & Integrations

### External APIs
- **OpenAI API**
  - Chat Completions API
  - Vision API
  - Models: gpt-4o, gpt-4o-mini

### Microservices Communication
- RESTful API communication
- JSON request/response format
- Coordinator API pattern

---

## 🎯 Architecture Patterns

### Design Patterns
- **Repository Pattern** - Data access abstraction
- **Use Case Pattern** - Business logic encapsulation
- **Service Layer** - Business services
- **Domain-Driven Design (DDD)** - Domain entities and services
- **Ports & Adapters** - Interface segregation

### Code Organization
- **ES Modules (ESM)** - Modern JavaScript modules
- **Layered Architecture** - Presentation, Application, Domain, Infrastructure

---

## 📝 Development Tools

### Code Quality
- **Jest** - Unit testing
- **ESLint** - Code linting (if configured)
- **Prettier** - Code formatting (if configured)

### Development Environment
- **nodemon** - Development server auto-reload
- **Vite Dev Server** - Frontend development server
- **Hot Module Replacement (HMR)** - Fast refresh

---

## 🎨 UI/UX Technologies

### Design System
- **Tailwind CSS** - Utility-first CSS
- **Custom Design Tokens** - Colors, spacing, typography, shadows
- **Dark Mode** - Class-based dark mode support

### User Interface
- **React Hooks** - useState, useEffect, useRef, useContext
- **Context API** - Theme management
- **Session Storage** - Client-side persistence
- **Local Storage** - Browser storage

---

## 📄 File Formats & Standards

### File Formats
- **Markdown (.md)** - Documentation
- **SQL (.sql)** - Database migrations
- **JSON** - Configuration and data
- **JavaScript (.js)** - Application code
- **JSX** - React components
- **CSS** - Styling (via Tailwind)

### Standards
- **ES6+** - Modern JavaScript features
- **JSX** - React syntax extension
- **CommonJS/ESM** - Module systems

---

## 🔄 Data Flow Technologies

### State Management
- **React State** - Component state
- **React Context** - Global state (theme)
- **Session Storage** - Temporary persistence
- **Browser Cache** - Client-side caching

### Data Fetching
- **Axios** - HTTP requests
- **Fetch API** - Native browser API (if used)
- **REST API** - Backend communication

---

## 📱 Browser Technologies

### Browser APIs
- **Web Speech API** - Speech recognition
- **Canvas API** - Image rendering (via html2canvas)
- **Local Storage API** - Persistent storage
- **Session Storage API** - Session storage

### Browser Support
- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ support required

---

## 🗂️ Project Structure Technologies

### File Organization
- **Monorepo Structure** - Frontend and Backend in same repo
- **Modular Architecture** - Separated concerns
- **Configuration Files** - JSON, JS configs

---

## 📚 Documentation & Standards

### Documentation Formats
- **Markdown** - README and docs
- **JSDoc** - Code documentation (if used)
- **SQL Comments** - Database documentation

---

## 🔍 Monitoring & Logging

### Logging
- **Console.log** - Native Node.js logging
- **Error Handling** - Try-catch blocks
- **Debug Logging** - Development logging

---

## 🌍 Environment & Configuration

### Environment Variables
- **dotenv** - Environment variable management
- **process.env** - Node.js environment access
- **Vite Environment Variables** - Frontend env vars (VITE_*)

### Configuration Files
- **package.json** - Node.js project config
- **vite.config.js** - Vite build config
- **tailwind.config.js** - Tailwind CSS config
- **postcss.config.js** - PostCSS config
- **Dockerfile** - Docker configuration
- **.github/workflows/** - GitHub Actions configs

---

## 📊 Summary Statistics

- **Total Backend Dependencies**: 13
- **Total Frontend Dependencies**: 7
- **Total Dev Dependencies**: 8
- **Database**: PostgreSQL
- **AI Services**: OpenAI (gpt-4o, gpt-4o-mini)
- **Deployment**: Railway (backend), Vercel (frontend) - optional
- **CI/CD**: GitHub Actions
- **Containerization**: Docker

---

*רשימה זו מתעדכנת לפי הקוד הקיים בפרויקט*

