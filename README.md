# CivicConnect UI

Welcome to the **CivicConnect** front-end user interface. CivicConnect is a modern citizen-engagement and complaint-resolution platform designed to bridge the gap between citizens, field officers, and administrative managers.

## 🚀 Overview

The UI is built as a responsive, premium Single Page (with Routing Guard) Web Interface using **Vanilla HTML**, **CSS (Style/Variables/Glassmorphism)**, and **Vanilla JavaScript**. It connects directly to the CivicConnect Spring Boot REST API.

---

## 📂 Codebase Structure

```
UI/
├── index.html                 # Login, Registration, and OTP Verification Portal
├── dashboard-citizen.html     # Portal for Citizens to file and view complaints
├── dashboard-officer.html     # Portal for Field Officers to view and resolve tasks
├── dashboard-admin.html       # Portal for Managers/Super Admins to manage categories & staff
├── oauth-success.html         # Redirect landing page for OAuth2 logins
├── css/
│   └── style.css              # Core styling system (CSS variables, animations, responsive design)
└── js/
    ├── api.js                 # HTTP fetch client wrapper, token auto-refresh, and Toast messages
    ├── auth.js                # Login, signup flow, OTP verification, and role routing
    ├── router.js              # Client-side role-based routing guards & profile management
    ├── citizen.js             # Logic for filing and tracking complaints
    ├── officer.js             # Logic for field officers updating ticket status
    └── admin.js               # User directories, staff promotions, and system category management
```

---

## 🔑 Features & User Roles

### 1. Registration & Authentication (`index.html`, `js/auth.js`)
* **Real-time Availability Checks**: Direct API validation on inputs to check if a username or email is already registered.
* **Two-Step OTP Sign-up**: OTP code verification emailed to the user for validation before account activation.
* **OAuth2 Integration**: Login options via third-party providers, redirected to `oauth-success.html` to establish user sessions.

### 2. Client-side Security Guards (`js/router.js`)
* Automatically checks the active user's roles from `sessionStorage`.
* Enforces role checks when switching dashboards and prevents unauthenticated access by redirecting users back to the index portal.

### 3. Citizen Portal (`dashboard-citizen.html`, `js/citizen.js`)
* **File Complaints**: Upload complaints with categorization, priority, address, and evidence images.
* **Personal Tracker**: Live overview of filed complaints sorted by status (Pending, In Progress, Resolved).

### 4. Officer Portal (`dashboard-officer.html`, `js/officer.js`)
* **Task List**: Overview of complaints assigned specifically to the logged-in officer.
* **Ticket Upgrades**: Form to update complaint status and upload resolution proof images.

### 5. Admin & Manager Portal (`dashboard-admin.html`, `js/admin.js`)
* **System Metrics**: Visual overview card metrics (complaint statuses, roles, user ID).
* **Category Management**: Edit, create, and remove citizen-facing categories.
* **User & Staff Directory**:
  * Super Admins can view directories of all Users, Officers, and Managers.
  * Update user roles (e.g. promote citizens to officers) or lock/suspend account statuses.
  * Restrict managers from re-assigning Super Admin or other Manager roles.

---

## 🛠️ Configuration & Run Instructions

1. **Backend Endpoint**:
   Open [js/api.js](file:///Users/vaibhavjangir/Desktop/Projects/Java%20Project/UI/js/api.js) and make sure the `API_BASE` constant matches your active backend address:
   ```javascript
   const API_BASE = 'http://localhost:8000/api/v1';
   ```

2. **Run Locally**:
   Simply open [index.html](file:///Users/vaibhavjangir/Desktop/Projects/Java%20Project/UI/index.html) in any modern browser, or run a local static server inside the `UI/` directory:
   * **Python**: `python3 -m http.server 8080`
   * **Node.js**: `npx serve` or Live Server extension in VS Code.
