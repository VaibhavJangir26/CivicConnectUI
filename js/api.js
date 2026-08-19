const API_BASE = 'https://civicconnect-backend-45bq.onrender.com/api/v1';

/* ===== THEME MANAGER (LIGHT BY DEFAULT + CACHING) ===== */
function initTheme() {
    const savedTheme = localStorage.getItem('civic_theme') || 'light';
    setTheme(savedTheme, false);
}

function setTheme(theme, save = true) {
    document.documentElement.setAttribute('data-theme', theme);
    if (save) {
        localStorage.setItem('civic_theme', theme);
    }
    document.querySelectorAll('.theme-toggle-btn').forEach(btn => {
        btn.innerHTML = theme === 'dark' ? '☀️' : '🌙';
        btn.setAttribute('title', theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode');
    });
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme, true);
}

// Apply cached theme immediately
initTheme();
document.addEventListener('DOMContentLoaded', initTheme);


/* ===== LOADER ===== */
function showLoader() { const el = document.getElementById('globalLoader'); if (el) el.classList.add('active'); }
function hideLoader() { const el = document.getElementById('globalLoader'); if (el) el.classList.remove('active'); }

/* ===== TOAST SYSTEM ===== */
function showToast(type, title, message, duration = 4000) {
    const container = document.getElementById('toastContainer');
    if (!container) { console.log(`[${type.toUpperCase()}] ${title}: ${message}`); return; }

    const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
        <div class="toast-body">
            <div class="toast-title">${title}</div>
            ${message ? `<div class="toast-message">${message}</div>` : ''}
        </div>
    `;
    container.appendChild(toast);

    const remove = () => {
        toast.classList.add('exiting');
        setTimeout(() => toast.remove(), 350);
    };
    setTimeout(remove, duration);
    toast.onclick = remove;
}

/* ===== CORE API REQUEST ===== */
async function apiRequest(endpoint, method = 'GET', data = null, isMultipart = false) {
    showLoader();
    const token = sessionStorage.getItem('accessToken');
    const headers = {};

    if (!isMultipart) {
        headers['Content-Type'] = 'application/json';
    }
    if (token && !endpoint.includes('/auth/')) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const config = { method, headers };
    if (data) {
        config.body = isMultipart ? data : JSON.stringify(data);
    }

    try {
        let response = await fetch(API_BASE + endpoint, config);

        // Auto token refresh on 401
        if (response.status === 401 && !endpoint.includes('/auth/')) {
            const refreshed = await triggerTokenRefresh();
            if (refreshed) {
                headers['Authorization'] = `Bearer ${sessionStorage.getItem('accessToken')}`;
                response = await fetch(API_BASE + endpoint, { ...config, headers });
            } else {
                sessionStorage.clear();
                window.location.replace('index.html');
                hideLoader();
                return { status: 401, data: null };
            }
        }

        const contentType = response.headers.get('content-type');
        const result = contentType && contentType.includes('json') ? await response.json() : await response.text();
        hideLoader();
        return { status: response.status, data: result };
    } catch (err) {
        console.error('API Error:', err);
        hideLoader();
        return { status: 500, data: { message: 'Server connection failed. Ensure the backend is running on port 8000.' } };
    }
}

/* ===== TOKEN REFRESH ===== */
async function triggerTokenRefresh() {
    const refreshToken = sessionStorage.getItem('refreshToken') || localStorage.getItem('refreshToken');
    if (!refreshToken) return false;
    try {
        const res = await fetch(API_BASE + '/auth/refresh-token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        });
        if (!res.ok) return false;
        const data = await res.json();
        const payload = data.data || data;
        if (payload?.accessToken) {
            sessionStorage.setItem('accessToken', payload.accessToken);
            if (payload.refreshToken) sessionStorage.setItem('refreshToken', payload.refreshToken);
            return true;
        }
    } catch (e) {
        console.error('Token refresh failed', e);
    }
    return false;
}

/* ===== MOBILE DRAWER TOGGLE ===== */
function toggleMobileDrawer() {
    const drawer = document.getElementById('sidebarDrawer');
    const backdrop = document.getElementById('drawerBackdrop');
    if (drawer) drawer.classList.toggle('mobile-open');
    if (backdrop) backdrop.classList.toggle('active');
}

/* ===== HELPERS ===== */
function getApiData(res) {
    if (!res || !res.data) return null;
    return res.data.data !== undefined ? res.data.data : res.data;
}

function extractErrorMessage(res) {
    if (!res || !res.data) return 'An unexpected error occurred.';
    if (typeof res.data === 'string') return res.data;
    return res.data.message || res.data.error || JSON.stringify(res.data);
}

/* ===== PAGINATION HTML BUILDER ===== */
function buildPaginationHtml(currentPage, totalPages, callbackName) {
    if (totalPages <= 1) return '';

    let html = '<div class="pagination-container">';
    
    // Previous Button
    html += `
        <button class="pagination-btn" ${currentPage === 0 ? 'disabled' : ''} onclick="${callbackName}(${currentPage - 1})">
            ◀ Prev
        </button>
    `;

    // Page Numbers (sliding window of max 5 pages)
    const maxVisible = 5;
    let startPage = Math.max(0, currentPage - 2);
    let endPage = Math.min(totalPages - 1, startPage + maxVisible - 1);
    
    if (endPage - startPage + 1 < maxVisible) {
        startPage = Math.max(0, endPage - maxVisible + 1);
    }

    for (let p = startPage; p <= endPage; p++) {
        html += `
            <button class="pagination-btn ${p === currentPage ? 'active' : ''}" onclick="${callbackName}(${p})">
                ${p + 1}
            </button>
        `;
    }

    // Next Button
    html += `
        <button class="pagination-btn" ${currentPage === totalPages - 1 ? 'disabled' : ''} onclick="${callbackName}(${currentPage + 1})">
            Next ▶
        </button>
    `;

    html += '</div>';
    return html;
}