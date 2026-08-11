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

// Global Search UI and Functionality
let searchDebounceTimer;
let suggestionDebounceTimer;

document.addEventListener('DOMContentLoaded', () => {
    setupGlobalSearchUI();
});

function setupGlobalSearchUI() {
    const input = document.getElementById('globalComplaintSearch');
    const suggestions = document.getElementById('globalSearchSuggestions');
    const clearBtn = document.getElementById('globalSearchClearBtn');
    if (!input || !suggestions) return;

    input.addEventListener('input', () => {
        const query = input.value.trim();
        
        // Show/hide ✕ button
        if (clearBtn) {
            if (query) clearBtn.classList.add('active');
            else clearBtn.classList.remove('active');
        }

        if (!query) {
            suggestions.style.display = 'none';
            suggestions.innerHTML = '';
            triggerGlobalClear();
            return;
        }

        // Debounce Autosuggestion API Call (300ms)
        clearTimeout(suggestionDebounceTimer);
        suggestionDebounceTimer = setTimeout(async () => {
            const res = await apiRequest(`/complains/suggest?query=${encodeURIComponent(query)}`, 'GET');
            if (res.status === 200 && res.data) {
                const arr = getApiData(res) || [];
                if (arr.length === 0) {
                    suggestions.style.display = 'none';
                    return;
                }
                suggestions.innerHTML = '';
                suggestions.style.display = 'flex';
                arr.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'search-dropdown-item';
                    
                    // Highlight matching substring for production style suggestions
                    const regex = new RegExp(`(${query})`, 'gi');
                    div.innerHTML = item.replace(regex, '<strong>$1</strong>');
                    
                    div.addEventListener('click', () => {
                        input.value = item;
                        suggestions.style.display = 'none';
                        if (clearBtn) clearBtn.classList.add('active');
                        triggerGlobalSearch();
                    });
                    suggestions.appendChild(div);
                });
            }
        }, 300);

        // Optional: Debounce actual Search results API Call (600ms) for real-time live typing filter!
        clearTimeout(searchDebounceTimer);
        searchDebounceTimer = setTimeout(() => {
            triggerGlobalSearch();
        }, 600);
    });

    // Close suggestions list on click outside
    document.addEventListener('click', (e) => {
        if (e.target !== input && e.target !== suggestions) {
            suggestions.style.display = 'none';
        }
    });

    // Support hitting Enter to search instantly
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            clearTimeout(searchDebounceTimer);
            suggestions.style.display = 'none';
            triggerGlobalSearch();
        }
    });
}

async function triggerGlobalSearch() {
    const input = document.getElementById('globalComplaintSearch');
    if (!input) return;
    const query = input.value.trim();
    if (!query) return;

    let containerId = '';
    const path = window.location.pathname;
    if (path.includes('dashboard-citizen.html')) {
        containerId = 'myComplaintsTableContainer';
    } else if (path.includes('dashboard-officer.html')) {
        containerId = 'assignedTasksContainer';
    } else if (path.includes('dashboard-admin.html')) {
        containerId = 'allComplaintsContainer';
    }

    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const res = await apiRequest(`/complains/search?keyword=${encodeURIComponent(query)}`, 'GET');
    if (res.status !== 200 || !res.data) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${extractErrorMessage(res)}</p></div>`;
        return;
    }

    const arr = getApiData(res) || [];
    renderSearchResultsTable(arr, containerId);
}

function triggerGlobalClear() {
    const input = document.getElementById('globalComplaintSearch');
    if (input) input.value = '';
    
    const clearBtn = document.getElementById('globalSearchClearBtn');
    if (clearBtn) clearBtn.classList.remove('active');

    const suggestions = document.getElementById('globalSearchSuggestions');
    if (suggestions) {
        suggestions.style.display = 'none';
        suggestions.innerHTML = '';
    }
    
    const path = window.location.pathname;
    if (path.includes('dashboard-citizen.html')) {
        if (typeof loadMyComplaints === 'function') loadMyComplaints();
    } else if (path.includes('dashboard-officer.html')) {
        if (typeof loadAssignedTasks === 'function') loadAssignedTasks();
    } else if (path.includes('dashboard-admin.html')) {
        if (typeof loadAllComplaints === 'function') loadAllComplaints();
    }
}

function renderSearchResultsTable(arr, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (arr.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><p>No complaints matched your search.</p></div>';
        return;
    }

    let rows = '';
    const isCitizen = window.location.pathname.includes('dashboard-citizen.html');
    const isOfficer = window.location.pathname.includes('dashboard-officer.html');
    const isAdmin = window.location.pathname.includes('dashboard-admin.html');

    arr.forEach(c => {
        const catName = c.categoryName || 'N/A';
        const statusLabel = c.complainStatus || 'PENDING';
        const priority = c.complainPriority || 'LOW';
        const citizen = c.citizenName || '—';
        const officer = c.assignedOfficerName || '—';
        const shortId = c.id ? c.id.substring(0, 8) + '…' : '—';

        let actions = '';
        if (isCitizen) {
            actions = `<button class="btn-secondary btn-sm" onclick="openComplaintModal('${c.id}')">🔍 Details</button>`;
        } else if (isOfficer) {
            actions = `
                <div style="display: flex; gap: 6px; flex-wrap: nowrap;">
                    <button class="btn-secondary btn-sm" onclick="openComplaintModal('${c.id}')">🔍 Details</button>
                    <button class="btn-secondary btn-sm" onclick="fillTaskForm('${c.id}')">✏️ Update</button>
                </div>`;
        } else if (isAdmin) {
            actions = `
                <div style="display: flex; gap: 6px; flex-wrap: nowrap;">
                    <button class="btn-secondary btn-sm" onclick="openComplaintModal('${c.id}')">🔍 Details</button>
                    <button class="btn-secondary btn-sm" onclick="fillManageForm('${c.id}')">✏️ Manage</button>
                    <button class="btn-danger btn-sm" onclick="deleteComplaint('${c.id}')">🗑️</button>
                </div>`;
        }

        if (isCitizen) {
            rows += `
                <tr>
                    <td title="${c.id}">${shortId}</td>
                    <td>${catName}</td>
                    <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.message}">${c.message}</td>
                    <td><span class="badge ${priority.toLowerCase()}">${priority}</span></td>
                    <td><span class="badge ${statusLabel.toLowerCase()}">${statusLabel}</span></td>
                    <td style="color: var(--text-muted); font-size: 0.78rem;">${officer ? `👷 ${officer}` : '—'}</td>
                    <td>${actions}</td>
                </tr>`;
        } else if (isOfficer) {
            rows += `
                <tr>
                    <td title="${c.id}">${shortId}</td>
                    <td>${catName}</td>
                    <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.message}">${c.message}</td>
                    <td>${citizen}</td>
                    <td><span class="badge ${priority.toLowerCase()}">${priority}</span></td>
                    <td><span class="badge ${statusLabel.toLowerCase()}">${statusLabel}</span></td>
                    <td>${actions}</td>
                </tr>`;
        } else {
            rows += `
                <tr>
                    <td title="${c.id}" style="font-family: monospace;">${shortId}</td>
                    <td>${catName}</td>
                    <td style="max-width: 180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.message}">${c.message}</td>
                    <td>${citizen}</td>
                    <td>${officer}</td>
                    <td><span class="badge ${priority.toLowerCase()}">${priority}</span></td>
                    <td><span class="badge ${statusLabel.toLowerCase()}">${statusLabel}</span></td>
                    <td>${actions}</td>
                </tr>`;
        }
    });

    let headers = '';
    if (isCitizen) {
        headers = '<tr><th>ID</th><th>Category</th><th>Message</th><th>Priority</th><th>Status</th><th>Officer</th><th>Action</th></tr>';
    } else if (isOfficer) {
        headers = '<tr><th>ID</th><th>Category</th><th>Message</th><th>Citizen</th><th>Priority</th><th>Status</th><th>Actions</th></tr>';
    } else {
        headers = '<tr><th>ID</th><th>Category</th><th>Message</th><th>Citizen</th><th>Officer</th><th>Priority</th><th>Status</th><th>Actions</th></tr>';
    }

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>${headers}</thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}