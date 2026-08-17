# 🏛️ CivicConnect UI — Modern Citizen Engagement Platform

[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/HTML)
[![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=for-the-badge&logo=css3&logoColor=white)](https://developer.mozilla.org/en-US/docs/Web/CSS)
[![JavaScript ES6+](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![Apple Glassmorphism](https://img.shields.io/badge/Design-Apple%20Liquid%20Glass-000000?style=for-the-badge&logo=apple&logoColor=white)](#-uiux-design-system)
[![OAuth2 Ready](https://img.shields.io/badge/Auth-Google%20%26%20GitHub-4285F4?style=for-the-badge&logo=google&logoColor=white)](#-oauth2-authentication)

CivicConnect is a **production-grade, ultra-responsive web application** built using **Vanilla HTML5, CSS3 (Custom Tokens & Glassmorphism), and ES6+ JavaScript**. It serves as the frontend for the CivicConnect Distributed Complaint Resolution Engine, enabling citizens, field officers, and administrative managers to file, track, and resolve municipal incidents in real time.

---

## 🌟 Executive Summary & Recruiter Highlights

This repository demonstrates **enterprise-level frontend engineering practices without framework bloat**:

* 💎 **Zero Framework Overhead**: Clean, high-performance vanilla architecture using DOM manipulation, event delegation, and modular ES6 imports—achieving instant load times (`< 100ms`).
* 🎨 **Apple Liquid Glassmorphism**: Tailored CSS design system featuring backdrop blur filters (`backdrop-filter: blur(20px)`), specular gradient overlays, soft elevation shadows, and non-clipping component stacking (`overflow: visible`).
* 🌓 **Dual Design Token Theme Engine**: Built-in Light (`orangeOutingPalette` with `#FE6601` warm orange gradients) and Dark (`blueNightPalette` with `#0095FF` electric azure gradients) themes with zero FOUC (`Flash of Unstyled Content`) `localStorage` state caching.
* 🔍 **Standalone Auto-Suggest Search Component**: Floating suggestions sheet (`z-index: 9999`) powered by debounced (300ms) Elasticsearch backend integration, inline local loading spinners (`#searchLocalLoader`), substring text highlighting (`<strong>query</strong>`), top-3 matching limit, and a dedicated `⚡ View all results` action row.
* 📱 **Mobile-First Responsive Shell**: Floating top navigation header (`.mobile-header-bar`), overlay drawer navigation (`z-index: 9999`), backdrop click dismissal (`z-index: 9998`), and tab-selection auto-closing logic.

---

## 📂 Architecture & Directory Structure

```
UI/
├── index.html                 # Split-Hero Auth Portal (Login, Registration, OTP, OAuth2)
├── dashboard-citizen.html     # Citizen Control Center (Ticket filing & live tracking)
├── dashboard-officer.html     # Field Officer Portal (Assigned task management & proof upload)
├── dashboard-admin.html       # Executive Control Center (Categories, staff directory & role upgrades)
├── oauth-success.html         # OAuth2 social redirect handler & JWT token initializer
├── css/
│   └── style.css              # Glassmorphism design system, token variables, & media queries
└── js/
    ├── api.js                 # HTTP fetch client wrapper, theme engine, token management, toasts
    ├── auth.js                # Auth state machine, OTP verification, real-time availability checks
    ├── router.js              # Client-side role routing guards, global search, profile UI
    ├── citizen.js             # Complaint creation, media proof upload, & personal ticket tracker
    ├── officer.js             # Officer task dispatching & resolution proof submission
    └── admin.js               # User directories, staff promotions, & system category controls
```

---

## 🚀 Quick Start & Installation

### Prerequisites
* Any modern web browser (Google Chrome, Mozilla Firefox, Safari, Microsoft Edge).
* Local or remote CivicConnect Backend API running at `http://localhost:8000/api/v1`.

### Option 1: Serve via Local Static Server (Recommended)

```bash
# Clone the repository
git clone https://github.com/VaibhavJangir26/CivicConnectUI.git
cd CivicConnectUI

# Run using Python
python3 -m http.server 8080

# OR run using Node.js
npx serve .
```

Access the application in your browser at `http://localhost:8080`.

---

## 🔑 Key Features & User Roles

### 1. Split-Hero Authentication Portal (`index.html`)
* **Real-time Input Validation**: Instant API checks on `blur` / `input` to verify if a username or email is available before form submission.
* **2-Step Email OTP Sign-Up**: Sends a 6-digit verification code to the user's email; account activation occurs upon valid OTP submission.
* **OAuth2 Social Sign-In**: Dedicated Google & GitHub login triggers using `devicon` SVG branding, handling token exchange through `oauth-success.html`.

### 2. Role-Based Access Control & Route Security (`js/router.js`)
* Client-side routing guards validate JWT session tokens and user roles (`CITIZEN`, `OFFICER`, `MANAGER`, `SUPER_ADMIN`).
* Automatically redirects unauthorized or unauthenticated users back to `index.html`.

### 3. Citizen Control Center (`dashboard-citizen.html`)
* **File New Incidents**: Input incident details, select categorization, set urgency/priority, provide geolocation address, and attach evidence photos.
* **Personal Tracker**: Live list of submitted complaints categorized by status (`PENDING`, `IN_PROGRESS`, `RESOLVED`).

### 4. Officer Work Order Portal (`dashboard-officer.html`)
* **Task Queue**: Real-time list of municipal tickets assigned specifically to the logged-in officer.
* **Status Updates**: Update ticket status and upload image proof upon task completion.

### 5. Executive Manager & Super Admin Portal (`dashboard-admin.html`)
* **System Metrics Dashboard**: Summary metrics for total complaints, pending tasks, resolved incidents, and active users.
* **Category Management**: Add, modify, or remove citizen-facing municipal categories.
* **User & Staff Directory**:
  * View full directory of registered citizens, officers, and admins.
  * Promote citizens to Field Officers or system Managers.
  * Update account statuses (`ACTIVE`, `SUSPENDED`, `LOCKED`).

---

## ⚙️ Configuration

To point the UI to a custom backend address, update the `API_BASE` constant in [js/api.js](file:///Users/vaibhavjangir/Desktop/Projects/Java%20Project/UI/js/api.js):

```javascript
const API_BASE = 'http://localhost:8000/api/v1';
```
