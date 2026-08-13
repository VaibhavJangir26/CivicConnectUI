# CivicConnect UI (Revamped Apple Glassmorphism Edition)

Welcome to the **CivicConnect** front-end application. CivicConnect is a production-grade, modern citizen-engagement and complaint-resolution platform designed to seamlessly connect citizens, field officers, and administrative managers.

---

## 🎨 What's New in the Revamped UI

The entire front-end user experience has been modernised using plain **HTML5**, **CSS3 (Custom Design Tokens & Apple Liquid Glass)**, and **Vanilla JavaScript ES6+**.

### 🌟 Key Highlights & Design Systems

1. **Apple Liquid Glassmorphism**:
   - Heavy backdrop blur filters (`backdrop-filter: blur(20px) saturate(180%)`), specular gradient overlays, and subtle drop shadows.
   - Non-clipping stacked component cards (`overflow: visible`) allowing floating overlays to extend smoothly over page elements.

2. **Dual Palette Theme Engine (Light & Dark)**:
   - **Light Theme (`orangeOutingPalette`)**: Warm cream scaffold (`#FFF9F5`), crisp white cards (`#FFFFFF`), dark slate typography (`#111827`), and vibrant orange gradients (`linear-gradient(135deg, #FF8226 0%, #FE6601 50%, #E55400 100%)`).
   - **Dark Theme (`blueNightPalette`)**: Deep midnight scaffold (`#05070A`), dark surface cards (`#0E1015`), crisp white text (`#FFFFFF`), and electric azure blue gradients (`linear-gradient(135deg, #38BDF8 0%, #0095FF 50%, #0284C7 100%)`).
   - **Zero-FOUC Theme Caching**: Persisted in `localStorage` (`civic_theme`) and initialized before DOM render to eliminate flicker.
   - Dedicated theme toggles (`🌙` / `☀️`) available in the top mobile header and sidebar footers.

3. **Split-Hero Authentication Portal (`index.html`)**:
   - Modern split-card layout featuring an architectural visual banner, brand tagline (*"Report. Track. Resolve."*), feature badges, and high-contrast login, registration, and OTP forms.
   - **OAuth2 Authentication**: Integrated Google and GitHub social logins using official `devicon` SVG network branding, redirecting through `oauth-success.html`.

4. **Production-Grade Standalone Search Component**:
   - **Isolated Search Card**: Housed in its own standalone container (`.search-card-wrapper`) positioned above data tables.
   - **Inline Local Loader**: Mini spinner (`#searchLocalLoader`) animates inside the input during debounced autosuggest queries—no page-blocking global loaders.
   - **Floating Auto-Suggestions**: Stacked floating sheet (`z-index: 9999`) displaying top **3 matching suggestions** with query substring highlighting (`<strong>query</strong>`).
   - **Action Item**: Includes a dedicated bottom option: `⚡ View all search results for "query"`.
   - Complete keyboard support (`Enter` to execute, `Escape` to dismiss) and click-outside auto-dismissal.

5. **Mobile-First Responsive Drawer**:
   - Dedicated mobile header bar (`.mobile-header-bar`) visible on screens `< 900px` with instant theme switcher.
   - Overlaid mobile side drawer (`z-index: 9999`) with backdrop overlay (`z-index: 9998`), header close button (`✕`), and automatic drawer dismissal upon menu tab navigation.

---

## 📂 Codebase Structure

```
UI/
├── index.html                 # Split-Hero Auth Portal (Login, Registration, OTP, OAuth2)
├── dashboard-citizen.html     # Citizen Portal (File & track complaints)
├── dashboard-officer.html     # Officer Portal (Manage & resolve assigned field tickets)
├── dashboard-admin.html       # Admin Portal (Category & staff management, system oversight)
├── oauth-success.html         # OAuth2 redirect handler & session initializer
├── css/
│   └── style.css              # Apple Glassmorphism design system, themes, & utility classes
└── js/
    ├── api.js                 # HTTP fetch client, theme engine, token management, toasts
    ├── auth.js                # Form submission, OTP verification, OAuth triggers
    ├── router.js              # Client-side role routing guards, global search, profile UI
    ├── citizen.js             # Citizen ticket submission & tracker logic
    ├── officer.js             # Officer task management & proof upload logic
    └── admin.js               # User directory management, role upgrades, category management
```

---

## 🔑 User Portals & Security Hierarchy

1. **Authentication (`index.html`, `js/auth.js`)**:
   - Username and Email real-time availability checks via backend API.
   - Two-step OTP verification emailed to citizens upon registration.
   - Google & GitHub OAuth2 session token exchange.

2. **Routing & Role Guards (`js/router.js`)**:
   - Client-side route guards validating session JWT tokens and user roles (`CITIZEN`, `OFFICER`, `MANAGER`, `SUPER_ADMIN`).

3. **Citizen Dashboard (`dashboard-citizen.html`)**:
   - Submit tickets with category selection, priority, address, and evidence uploads.
   - Track ticket progress (Pending, In Progress, Resolved).

4. **Officer Dashboard (`dashboard-officer.html`)**:
   - View assigned field tickets.
   - Update ticket statuses and upload completion proof.

5. **Admin Dashboard (`dashboard-admin.html`)**:
   - Monitor system metrics and complaint distributions.
   - Create, edit, and remove complaint categories.
   - Manage user directories, promote citizens to officers, and modify account statuses.

---

## 🛠️ Configuration & Run Instructions

1. **API Base URL**:
   Ensure `API_BASE` in [js/api.js](file:///Users/vaibhavjangir/Desktop/Projects/Java%20Project/UI/js/api.js) points to your active backend server:
   ```javascript
   const API_BASE = 'http://localhost:8000/api/v1';
   ```

2. **Run Locally**:
   Simply launch `index.html` in any browser or serve statically:
   ```bash
   # Python
   python3 -m http.server 8080

   # Node.js
   npx serve
   ```
