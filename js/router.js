/* ===== ROLE GUARD ===== */
(function enforceRoleAccess() {
    const token = sessionStorage.getItem('accessToken');
    const rolesJSON = sessionStorage.getItem('userRoles');

    if (!token || !rolesJSON) {
        if (!window.location.pathname.includes('index.html')) {
            window.location.href = 'index.html';
        }
        return;
    }

    const roles = JSON.parse(rolesJSON);
    const path = window.location.pathname;

    if (path.includes('dashboard-admin.html')) {
        if (!roles.includes('ROLE_MANAGER') && !roles.includes('ROLE_SUPER_ADMIN')) {
            window.location.href = 'dashboard-citizen.html';
        }
    } else if (path.includes('dashboard-officer.html')) {
        if (!roles.includes('ROLE_OFFICER') && !roles.includes('ROLE_MANAGER') && !roles.includes('ROLE_SUPER_ADMIN')) {
            window.location.href = 'dashboard-citizen.html';
        }
    }
})();

/* ===== LOGOUT ===== */
async function handleLogout() {
    const refresh = sessionStorage.getItem('refreshToken');
    if (refresh) {
        await apiRequest('/auth/logout', 'POST', { refreshToken: refresh });
    }
    sessionStorage.clear();
    window.location.href = 'index.html';
}

/* ===== LOAD PROFILE (called by every dashboard on DOMContentLoaded) ===== */
async function loadProfileData() {
    const res = await apiRequest('/profile/me', 'GET');
    if (res.status === 200 && res.data) {
        const profile = getApiData(res);

        const nameVal = profile.fullName || profile.username || 'User';
        const roleRaw = (profile.roles && [...profile.roles][0]) || 'ROLE_CITIZEN';
        const roleClean = roleRaw.replace('ROLE_', '');
        const firstLetter = nameVal.charAt(0).toUpperCase();

        // Sidebar pill
        const el = id => document.getElementById(id);
        if (el('avatarLetter')) el('avatarLetter').textContent = firstLetter;
        if (el('profileShortName')) el('profileShortName').textContent = nameVal;
        if (el('profileShortRole')) el('profileShortRole').textContent = roleClean;

        // Dashboard stat cards
        if (el('welcomeUserTitle')) el('welcomeUserTitle').textContent = nameVal;
        if (el('statUserRole')) el('statUserRole').textContent = roleClean;
        if (el('statUsername')) el('statUsername').textContent = profile.username || '—';
        if (el('statProfileId')) el('statProfileId').textContent = profile.id || '—';

        // Account status badge
        if (el('statAccountStatus')) {
            const s = profile.accountStatus || 'ACTIVE';
            el('statAccountStatus').innerHTML = `<span class="badge ${s.toLowerCase()}">${s}</span>`;
        }

        // Fill universal profile form fields if present
        if (el('profFullName')) el('profFullName').value = profile.fullName || '';
        if (el('profMobileNo')) el('profMobileNo').value = profile.mobileNo || '';
        if (el('profDob')) el('profDob').value = profile.dob || '';
        if (profile.address) {
            if (el('profAddressLine')) el('profAddressLine').value = profile.address.addressLine || '';
            if (el('profCity')) el('profCity').value = profile.address.city || '';
            if (el('profState')) el('profState').value = profile.address.state || '';
            if (el('profPincode')) el('profPincode').value = profile.address.pincode || '';
            if (el('profCountry')) el('profCountry').value = profile.address.country || '';
        }

        return profile;
    }
    return null;
}

/* ===== UNIVERSAL PROFILE FORM HANDLER ===== */
function setupProfileFormHandler() {
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm && !updateProfileForm.dataset.bound) {
        updateProfileForm.dataset.bound = 'true';
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                fullName: document.getElementById('profFullName')?.value?.trim() || null,
                mobileNo: document.getElementById('profMobileNo')?.value?.trim() || null,
                dob: document.getElementById('profDob')?.value || null,
                address: {
                    addressLine: document.getElementById('profAddressLine')?.value?.trim() || null,
                    city: document.getElementById('profCity')?.value?.trim() || null,
                    state: document.getElementById('profState')?.value?.trim() || null,
                    pincode: document.getElementById('profPincode')?.value?.trim() || null,
                    country: document.getElementById('profCountry')?.value?.trim() || null
                }
            };

            const hasAddress = Object.values(payload.address).some(v => v !== null);
            if (!hasAddress) delete payload.address;

            const res = await apiRequest('/profile/me', 'PUT', payload);
            if (res.status === 200) {
                showToast('success', 'Profile Updated', 'Your profile details have been saved successfully.');
                await loadProfileData();
            } else {
                showToast('error', 'Update Failed', extractErrorMessage(res));
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    setupProfileFormHandler();
});

/* ===== TAB SWITCHER ===== */
function switchViewTab(tabId) {
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.view-panel').forEach(el => el.classList.remove('active'));

    const tab = document.querySelector(`[data-tab="${tabId}"]`);
    if (tab) tab.classList.add('active');

    const panel = document.getElementById(`panel-${tabId}`);
    if (panel) panel.classList.add('active');
}

/* ===== COMPLAINT DETAILS MODAL ===== */
async function openComplaintModal(complaintId) {
    const modal = document.getElementById('complaintDetailModal');
    if (!modal) return;

    const el = id => document.getElementById(id);

    // Open modal INSTANTLY and set loading states
    modal.classList.remove('hidden');

    if (el('modalCompTitle')) el('modalCompTitle').textContent = `Loading Details...`;
    if (el('modalCompId')) el('modalCompId').textContent = `#${complaintId.substring(0, 8)}…`;
    if (el('modalCompMessage')) el('modalCompMessage').innerHTML = '<span class="spinner" style="width:20px; height:20px; display:inline-block; vertical-align:middle; margin-right:8px;"></span> Loading complaint description...';
    if (el('modalCompCitizen')) el('modalCompCitizen').textContent = 'Loading...';
    if (el('modalCompOfficer')) el('modalCompOfficer').textContent = 'Loading...';
    if (el('modalCompAddress')) el('modalCompAddress').textContent = 'Loading location...';
    if (el('modalCompImages')) el('modalCompImages').innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">Loading images...</span>';
    if (el('modalProofImages')) el('modalProofImages').innerHTML = '<span style="color:var(--text-muted); font-size:0.85rem;">Loading proof...</span>';
    if (el('modalCompCreatedAt')) el('modalCompCreatedAt').textContent = '—';
    if (el('modalCompUpdatedAt')) el('modalCompUpdatedAt').textContent = '—';

    // Fetch details asynchronously using apiRequest for authentication & auto-refresh
    try {
        const res = await apiRequest(`/complains/${complaintId}`, 'GET');
        const c = getApiData(res);

        if (res.status !== 200 || !c) {
            if (el('modalCompMessage')) el('modalCompMessage').textContent = 'Failed to load complaint details: ' + extractErrorMessage(res);
            return;
        }

        if (el('modalCompTitle')) el('modalCompTitle').textContent = `Complaint Details`;
        if (el('modalCompId')) el('modalCompId').textContent = `#${c.id}`;
        if (el('modalCompMessage')) el('modalCompMessage').textContent = c.message || 'No description provided.';
        if (el('modalCompCitizen')) el('modalCompCitizen').textContent = c.citizenName || 'Anonymous / Unspecified';
        if (el('modalCompOfficer')) el('modalCompOfficer').textContent = c.assignedOfficerName ? `👷 ${c.assignedOfficerName}` : '❌ Unassigned';

        // Badges
        const status = c.complainStatus || 'PENDING';
        const priority = c.complainPriority || 'LOW';
        const categoryName = c.category ? c.category.categoryName : 'General';

        if (el('modalCompStatus')) {
            el('modalCompStatus').className = `badge ${status.toLowerCase()}`;
            el('modalCompStatus').textContent = status;
        }
        if (el('modalCompPriority')) {
            el('modalCompPriority').className = `badge ${priority.toLowerCase()}`;
            el('modalCompPriority').textContent = priority;
        }
        if (el('modalCompCategory')) {
            el('modalCompCategory').textContent = categoryName;
        }

        // Address
        if (el('modalCompAddress')) {
            if (c.address) {
                const a = c.address;
                const parts = [a.addressLine, a.city, a.state, a.pincode, a.country].filter(Boolean);
                el('modalCompAddress').textContent = parts.length > 0 ? parts.join(', ') : 'No location specified.';
            } else {
                el('modalCompAddress').textContent = 'No location specified.';
            }
        }

        // Evidence Images
        if (el('modalCompImages')) {
            if (c.imageUrls && c.imageUrls.length > 0) {
                let html = '';
                c.imageUrls.forEach((url, i) => {
                    html += `<a href="${url}" target="_blank" title="Evidence Image ${i+1}">
                        <img src="${url}" style="width:72px; height:72px; object-fit:cover; border-radius: var(--radius-md); border: 2px solid var(--border-color);" />
                    </a>`;
                });
                el('modalCompImages').innerHTML = html;
            } else {
                el('modalCompImages').innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No evidence images uploaded.</span>';
            }
        }

        // Proof Images
        if (el('modalProofImages')) {
            if (c.proofImageUrls && c.proofImageUrls.length > 0) {
                let html = '';
                c.proofImageUrls.forEach((url, i) => {
                    html += `<a href="${url}" target="_blank" title="Proof Image ${i+1}">
                        <img src="${url}" style="width:72px; height:72px; object-fit:cover; border-radius: var(--radius-md); border: 2px solid var(--emerald);" />
                    </a>`;
                });
                el('modalProofImages').innerHTML = html;
            } else {
                el('modalProofImages').innerHTML = '<span style="color: var(--text-muted); font-size: 0.85rem;">No resolution proof uploaded yet.</span>';
            }
        }

        // Timestamps
        if (el('modalCompCreatedAt')) el('modalCompCreatedAt').textContent = c.createdAt ? new Date(c.createdAt).toLocaleString() : '—';
        if (el('modalCompUpdatedAt')) el('modalCompUpdatedAt').textContent = c.updatedAt ? new Date(c.updatedAt).toLocaleString() : '—';

        // Action Footer (Update Status / Manage Ticket)
        if (el('modalActionFooter')) {
            const page = window.location.pathname;
            if (page.includes('dashboard-officer.html')) {
                el('modalActionFooter').innerHTML = `<button type="button" class="btn-primary btn-sm" onclick="closeComplaintModal(); fillTaskForm('${c.id}');">✏️ Update Status</button>`;
            } else if (page.includes('dashboard-admin.html')) {
                el('modalActionFooter').innerHTML = `<button type="button" class="btn-primary btn-sm" onclick="closeComplaintModal(); fillManageForm('${c.id}');">✏️ Manage Ticket</button>`;
            } else {
                el('modalActionFooter').innerHTML = '';
            }
        }
    } catch (err) {
        if (el('modalCompMessage')) el('modalCompMessage').textContent = 'Network error loading details.';
    }
}

function closeComplaintModal() {
    const modal = document.getElementById('complaintDetailModal');
    if (modal) modal.classList.add('hidden');
}