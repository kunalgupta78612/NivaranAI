# 🏛️ Nivaran AI (CivicFlow) — Intelligent Civic Resolution Platform
> **AI-Powered Citizen Grievance Classification, Automated Routing & Transparent SLA Governance**

[![React](https://img.shields.io/badge/Frontend-React_18_|_Vite_|_Tailwind-blue.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Backend-Node.js_|_Express_|_MongoDB-green.svg)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)]()

---

## 📌 Executive Overview

**Nivaran AI** (CivicFlow) is an end-to-end AI-powered citizen grievance intelligence and resolution platform designed for modern smart cities and municipal governance. Standard grievance portals fail because they rely on manual triaging, lack proof-of-work verification, allow ghost-closures by officers, and optimize only for citizens who complain loudly.

Nivaran AI solves this with:
1. **Multi-modal Voice & Text Intake**: Instant voice dictation in native languages (including Hindi `hi-IN`), powered by AI harm scoring and semantic deduplication.
2. **Citizen Verification & Resolution Trap**: Tickets marked as resolved by officers move to an `unverified` status until validated by the citizen. Reopened tickets automatically drop officer integrity scores.
3. **Silence Detector (Equity Analysis)**: AI analysis detects "blind spots"—wards with high expected complaints but near-zero reported issues—identifying underserved populations.
4. **God-Mode Commissioner Command Center**: Real-time GIS cluster mapping, officer accountability leaderboards, asset failure intelligence, and tamper-proof on-chain audit logs.

---

## 👥 Contributors

This project was crafted with passion by:

- 👨‍💻 **Kunal Gupta**
- 👨‍💻 **Parth Pahare**
- 👩‍💻 **Astha Jain**
- 👨‍💻 **Vishvjeet Rathore**

---

## 🌟 Key Features & Portals

### 🟢 1. Citizen Portal (`/citizen`)
- **Voice-to-Ticket AI**: Mic button supporting real Web Speech API voice intake.
- **Geotagged Multi-modal Reporting**: Upload photos with embedded coordinates and auto-category mapping.
- **8-Stage AI Classification Engine**: Computes dynamic Harm Scores considering category severity, proximity to critical facilities (schools, hospitals), time of day, and reporting velocity.
- **Citizen Audit & Re-open Mechanism**: Prevents false resolutions through a one-tap *"Nahi hua — Re-open & Escalate"* trigger.

### 🟠 2. Ground Officer Kanban Board (`/officer`)
- **Real-Time SLA Countdown**: Dynamic SLA tracking per card with automated red breach warnings.
- **Proof-of-Resolution Verification**: Requires photo evidence submission before state transition to `closed_unverified`.
- **Automated Re-routing**: Reopened tickets return to To-Do with highlighted red badges and priority escalation.

### 🔵 3. City Commissioner "God Mode" (`/admin`)
- **GIS Incident Cluster Map**: MapLibre integration clustering localized complaints within tight geographical radii.
- **Silence Detector (Blind Spot Toggle)**: Single-click visualization highlighting wards where citizens have stopped reporting due to lack of trust or access.
- **Officer Integrity Leaderboard**: Worst-first ranking sorting officers based on SLA adherence and citizen reopening rates.
- **Asset Intelligence**: Identifies repeat-failure infrastructure assets (transformers, main pipelines).
- **On-Chain Audit Log (`/admin/chain`)**: Immutable event logging for SLA breaches and escalations ensuring non-repudiation.

---

## 🛠️ Technology Stack

| Layer | Technologies Used |
|---|---|
| **Frontend** | React 18, Vite, Tailwind CSS, Framer Motion, Lucide React, Recharts, MapLibre GL, TanStack React Query, Axios |
| **Backend** | Node.js, Express.js, MongoDB & Mongoose (`$geoNear` & `$vectorSearch`), HTTP-Only JWT Cookies, Bcrypt.js, Helmet, Express Rate Limit, Morgan |
| **Integrations** | Web Speech API (`hi-IN`), On-Chain Audit Hash Logging, Carto Basemaps (Token-free GIS) |

---

## 📁 Repository Structure

```
NivarnAI/
├── Backend/                    # Node.js Express REST API & Database Models
│   ├── config/                 # DB Connection & Admin Seeding
│   ├── controllers/            # Auth, Grievance, Admin, & Department Controllers
│   ├── middleware/             # JWT Protection & Authorization Guards
│   ├── models/                 # Mongoose Schemas (Admin, Citizen, Department, Grievance)
│   ├── routes/                 # API Endpoint Definitions
│   ├── utils/                  # Helper Utilities (JWT, Cookies, Error Handlers)
│   ├── validators/             # Request Input Validation Rules
│   └── server.js               # Application Entrypoint & CORS Configuration
│
└── nivaran-frontend/           # React Single-Page Web Application
    ├── public/                 # Static Assets & Icons
    └── src/
        ├── api/                # Axios API Services & HTTP Interceptors
        ├── components/         # Reusable UI Controls, Phone Frame, Layouts, Maps
        ├── lib/                # Mock Data Corpus & API Switcher Abstraction
        ├── pages/
        │   ├── AuthPage.jsx    # Unified Portal Login & Registration
        │   ├── Landing.jsx     # Marketing & Feature Showcase
        │   ├── admin/          # GodMode, SilenceDetector, AssetIntel, ChainAudit
        │   ├── citizen/        # CitizenPortal & Grievance Tracker
        │   └── officer/        # Officer Kanban Resolution Board
        ├── store/              # AppStore (Cross-Role Demo State Management)
        └── App.jsx             # React Router Setup & Provider Wrapping
```

---

## 🚀 Quick Start & Installation

### Prerequisites
- **Node.js** (v18.0.0 or higher)
- **npm** (v9.0.0 or higher)
- **MongoDB** (Local instance or MongoDB Atlas cluster)

### 1️⃣ Setup & Run Backend

```bash
cd Backend

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Start development server
npm run dev
```

*Backend server will start on `http://localhost:5000` (Health Check: `http://localhost:5000/api/health`).*

#### Backend `.env` Configuration
```env
PORT=5000
NODE_ENV=development
MONGO_URI=mongodb://localhost:27017/civicflow
JWT_SECRET=your_super_secret_jwt_key
CLIENT_URL=http://localhost:5173
```

---

### 2️⃣ Setup & Run Frontend

```bash
cd nivaran-frontend

# Install dependencies
npm install

# Start Vite dev server
npm run dev
```

*Frontend web app will launch at `http://localhost:5173`.*

#### Frontend `.env` Configuration
```env
VITE_DATA_MODE=live   # Set to 'mock' for offline demo mode or 'live' for API mode
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 🔌 Primary API Endpoints

### 🔐 Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new citizen
- `POST /api/auth/login` — Authenticate citizen & set HTTP-only cookie
- `GET /api/auth/me` — Fetch currently authenticated user profile
- `POST /api/auth/logout` — Revoke session token

### 📝 Grievances (`/api/grievances`)
- `POST /api/grievances` — Submit new grievance (Triggers AI Harm scoring)
- `GET /api/grievances` — Fetch grievances (Supports filtering by ward, priority, category)
- `GET /api/grievances/my` — Retrieve authenticated citizen's complaints
- `POST /api/grievances/:id/close` — Mark grievance as resolved with photo proof (`closed_unverified`)
- `POST /api/grievances/:id/verify` — Citizen verification response (`verified_resolved` OR `reopened`)

### 🏢 Department & Officer (`/api/department`)
- `POST /api/department/login` — Department officer login
- `GET /api/department/grievances` — Fetch department-specific Kanban board tickets
- `PATCH /api/department/grievances/:id/status` — Update ticket progress status

### 🏛️ Admin & Governance (`/api/admin`)
- `GET /api/admin/stats` — City-wide KPI aggregate metrics
- `GET /api/admin/departments` — List departments & approval statuses
- `GET /api/admin/citizens` — List registered citizens & activity counts

---

## 🎬 3-Minute Live Pitch & Demonstration Workflow

1. **Citizen Portal (`/citizen`)**:
   - Click the Mic button and dictate: *"Mere ghar ke paas transformer jal gaya hai, spark bhi ho raha hai"*.
   - Submit → AI pipeline categorizes, assesses harm score, binds asset, and routes ticket (~8s).

2. **Role Switcher → Ground Officer (`/officer`)**:
   - Observe ticket pinned to the top of the **To-Do** column.
   - Click `Start Work` → `Mark Resolved + Proof` → Upload resolution photo.
   - Status shifts to `closed_unverified`.

3. **Role Switcher → Citizen (`/citizen/track`)**:
   - Verification prompt active.
   - Click **"Nahi hua — Re-open & Escalate"**.
   - Watch ticket reopen as **CRITICAL**, escalate to Zonal Officer, and flag recycled proof.

4. **Role Switcher → Commissioner (`/admin`)**:
   - Inspect **Officer Integrity Leaderboard** — offending officer score drops immediately.
   - Toggle **`Show Blind Spots`** — map highlights underserved wards needing proactive outreach.

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
