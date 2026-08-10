const API_BASE = 'http://localhost:8000/api/v1';

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
    if (token) {
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
                window.location.href = 'index.html';
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
    const refreshToken = sessionStorage.getItem('refreshToken');
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