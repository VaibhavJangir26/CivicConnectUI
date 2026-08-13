/* ===== AUTH.JS — Fully aligned with backend DTOs ===== */

document.addEventListener('DOMContentLoaded', () => {
    // Dynamically bind OAuth endpoints based on API_BASE
    const backendOrigin = API_BASE.replace('/api/v1', '');
    const googleBtn = document.getElementById('googleOAuthBtn');
    const githubBtn = document.getElementById('githubOAuthBtn');
    const googleBtnReg = document.getElementById('googleOAuthBtnReg');
    const githubBtnReg = document.getElementById('githubOAuthBtnReg');

    const googleUrl = `${backendOrigin}/oauth2/authorization/google`;
    const githubUrl = `${backendOrigin}/oauth2/authorization/github`;

    if (googleBtn) googleBtn.href = googleUrl;
    if (githubBtn) githubBtn.href = githubUrl;
    if (googleBtnReg) googleBtnReg.href = googleUrl;
    if (githubBtnReg) githubBtnReg.href = githubUrl;

    // Redirect already-authenticated users away from login page
    const existingToken = sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken');
    const existingRoles = sessionStorage.getItem('userRoles') || localStorage.getItem('userRoles');
    if (existingToken && existingRoles) {
        try {
            routeUserBasedOnRole(JSON.parse(existingRoles));
            return;
        } catch (e) {
            sessionStorage.clear();
            localStorage.clear();
        }
    }

    let cachedSignupEmail = null;

    /* ----- LOGIN FORM ----- */
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('loginUsername').value.trim();
            const password = document.getElementById('loginPassword').value;

            if (!username || !password) {
                showToast('warning', 'Missing Fields', 'Please enter your username and password.');
                return;
            }

            const res = await apiRequest('/auth/login', 'POST', { username, password });
            if (res.status === 200) {
                const payload = getApiData(res) || res.data;
                if (payload?.accessToken) {
                    handleSuccessfulLogin(payload);
                } else {
                    showToast('error', 'Login Failed', 'Unexpected server response. Try again.');
                }
            } else {
                showToast('error', 'Login Failed', extractErrorMessage(res));
            }
        });
    }

    /* ----- REGISTER FORM ----- */
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        // Real-time availability check for username
        let usernameTimer;
        const usernameInput = document.getElementById('regUsername');
        const emailInput = document.getElementById('regEmail');

        if (usernameInput) {
            usernameInput.addEventListener('input', () => {
                clearTimeout(usernameTimer);
                const val = usernameInput.value.trim();
                const indicator = document.getElementById('usernameAvail');
                if (!val || val.length < 3) { if (indicator) indicator.innerHTML = ''; return; }
                if (indicator) indicator.innerHTML = `<span class="availability-indicator checking">⏳ Checking...</span>`;

                usernameTimer = setTimeout(async () => {
                    const res = await fetch(`${API_BASE}/auth/check-availability?username=${encodeURIComponent(val)}`);
                    const data = await res.json().catch(() => null);
                    const d = data?.data || data;
                    if (!indicator) return;
                    if (d?.usernameExists) {
                        indicator.innerHTML = `<span class="availability-indicator taken">✗ Username already taken</span>`;
                    } else {
                        indicator.innerHTML = `<span class="availability-indicator available">✓ Username available</span>`;
                    }
                }, 600);
            });
        }

        if (emailInput) {
            let emailTimer;
            emailInput.addEventListener('input', () => {
                clearTimeout(emailTimer);
                const val = emailInput.value.trim();
                const indicator = document.getElementById('emailAvail');
                if (!val || !val.includes('@')) { if (indicator) indicator.innerHTML = ''; return; }
                if (indicator) indicator.innerHTML = `<span class="availability-indicator checking">⏳ Checking...</span>`;

                emailTimer = setTimeout(async () => {
                    const res = await fetch(`${API_BASE}/auth/check-availability?email=${encodeURIComponent(val)}`);
                    const data = await res.json().catch(() => null);
                    const d = data?.data || data;
                    if (!indicator) return;
                    if (d?.emailExists) {
                        indicator.innerHTML = `<span class="availability-indicator taken">✗ Email already registered</span>`;
                    } else {
                        indicator.innerHTML = `<span class="availability-indicator available">✓ Email available</span>`;
                    }
                }, 600);
            });
        }

        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                fullName: document.getElementById('regFullName').value.trim(),
                email: document.getElementById('regEmail').value.trim().toLowerCase(),
                username: document.getElementById('regUsername').value.trim(),
                password: document.getElementById('regPassword').value
            };

            if (!payload.fullName || !payload.email || !payload.username || !payload.password) {
                showToast('warning', 'Missing Fields', 'All fields are required to create your account.');
                return;
            }
            if (payload.password.length < 6) {
                showToast('warning', 'Weak Password', 'Password must be at least 6 characters long.');
                return;
            }

            const res = await apiRequest('/auth/signup-initiate', 'POST', payload);
            if (res.status === 200) {
                cachedSignupEmail = payload.email;
                document.getElementById('otpEmailTarget').textContent = payload.email;
                document.getElementById('otpModal').classList.remove('hidden');
                document.getElementById('modalOtpInput').value = '';
                document.getElementById('modalOtpInput').focus();
                showToast('info', 'Verification Code Sent', `Check your email at ${payload.email} for a 6-digit code.`);
            } else {
                showToast('error', 'Signup Failed', extractErrorMessage(res));
            }
        });
    }

    /* ----- OTP VERIFY BUTTON ----- */
    const btnVerify = document.getElementById('btnVerifyAndRegister');
    if (btnVerify) {
        btnVerify.addEventListener('click', async () => {
            const otp = document.getElementById('modalOtpInput').value.trim().replace(/\D/g, '');
            if (otp.length !== 6) {
                showToast('warning', 'Invalid Code', 'Please enter the full 6-digit code from your email.');
                return;
            }
            if (!cachedSignupEmail) {
                showToast('error', 'Session Lost', 'Registration session expired. Please register again.');
                closeOtpModal();
                return;
            }

            const res = await apiRequest('/auth/verify-and-register', 'POST', {
                email: cachedSignupEmail,
                otp: otp
            });

            if (res.status === 200) {
                const payload = getApiData(res) || res.data;
                if (payload?.accessToken) {
                    closeOtpModal();
                    showToast('success', 'Account Created!', 'Welcome to Civic Connect! Redirecting...');
                    setTimeout(() => handleSuccessfulLogin(payload), 1000);
                } else {
                    showToast('error', 'Verification Error', 'Server returned unexpected data.');
                }
            } else {
                showToast('error', 'Verification Failed', extractErrorMessage(res));
            }
        });
    }

    // Allow pressing Enter in OTP input
    const otpInput = document.getElementById('modalOtpInput');
    if (otpInput) {
        otpInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') document.getElementById('btnVerifyAndRegister')?.click();
        });
        // Auto-format: only allow digits
        otpInput.addEventListener('input', () => {
            otpInput.value = otpInput.value.replace(/\D/g, '').substring(0, 6);
        });
    }
});

/* ===== RESEND OTP ===== */
async function resendOtp() {
    const email = document.getElementById('otpEmailTarget')?.textContent;
    if (!email) { showToast('error', 'Error', 'Email not found. Please restart registration.'); return; }
    showToast('info', 'Resending...', 'Please wait 60 seconds between code requests.');
}

/* ===== CLOSE OTP MODAL ===== */
function closeOtpModal() {
    const modal = document.getElementById('otpModal');
    if (modal) modal.classList.add('hidden');
}

/* ===== SUCCESSFUL LOGIN HANDLER ===== */
function handleSuccessfulLogin(payload) {
    sessionStorage.setItem('accessToken', payload.accessToken);
    localStorage.setItem('accessToken', payload.accessToken);
    if (payload.refreshToken) {
        sessionStorage.setItem('refreshToken', payload.refreshToken);
        localStorage.setItem('refreshToken', payload.refreshToken);
    }
    const roles = Array.isArray(payload.roles) ? payload.roles : [];
    sessionStorage.setItem('userRoles', JSON.stringify(roles));
    localStorage.setItem('userRoles', JSON.stringify(roles));
    routeUserBasedOnRole(roles);
}

/* ===== OAUTH2 SUCCESS (for oauth-success.html) ===== */
function handleOAuthCallback() {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    if (accessToken && refreshToken) {
        sessionStorage.setItem('accessToken', accessToken);
        sessionStorage.setItem('refreshToken', refreshToken);
        localStorage.setItem('accessToken', accessToken);
        localStorage.setItem('refreshToken', refreshToken);
        // Must fetch profile to get roles
        fetch(`${API_BASE}/profile/me`, {
            headers: { 'Authorization': 'Bearer ' + accessToken }
        })
        .then(r => r.json())
        .then(data => {
            const profile = data.data || data;
            const roles = Array.isArray(profile.roles) ? [...profile.roles] : [];
            sessionStorage.setItem('userRoles', JSON.stringify(roles));
            localStorage.setItem('userRoles', JSON.stringify(roles));
            routeUserBasedOnRole(roles);
        })
        .catch(() => {
            sessionStorage.setItem('userRoles', JSON.stringify([]));
            localStorage.setItem('userRoles', JSON.stringify([]));
            window.location.replace('dashboard-citizen.html');
        });
    } else {
        window.location.replace('index.html');
    }
}

/* ===== ROLE-BASED ROUTING ===== */
function routeUserBasedOnRole(rolesArray) {
    if (!Array.isArray(rolesArray)) rolesArray = [];
    let target = 'dashboard-citizen.html';
    if (rolesArray.includes('ROLE_SUPER_ADMIN') || rolesArray.includes('ROLE_MANAGER')) {
        target = 'dashboard-admin.html';
    } else if (rolesArray.includes('ROLE_OFFICER')) {
        target = 'dashboard-officer.html';
    }
    window.location.replace(target);
}