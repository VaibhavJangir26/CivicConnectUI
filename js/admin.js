/* ===== ADMIN.JS — Fully aligned with backend DTOs ===== */

document.addEventListener('DOMContentLoaded', async () => {
    loadSystemCategories();
    loadUsers();
    loadAllComplaints();
    loadProfilesForDropdown();

    /* ----- STAFF PROVISION FORM ----- */
    const adminUserForm = document.getElementById('adminUserForm');
    if (adminUserForm) {
        adminUserForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const payload = {
                profileId: document.getElementById('staffProfileId').value,
                accountStatus: document.getElementById('staffStatus').value,
                statusReason: document.getElementById('staffReason').value.trim()
            };

            if (!payload.profileId) {
                showToast('warning', 'Missing Field', 'Please select a target user profile.');
                return;
            }

            const res = await apiRequest('/admin/staff', 'POST', payload);
            if (res.status === 201 || res.status === 200) {
                showToast('success', 'Staff Provisioned', 'Staff account control has been registered successfully.');
                adminUserForm.reset();
                loadUsers();
            } else {
                showToast('error', 'Provisioning Failed', extractErrorMessage(res));
            }
        });
    }

    /* ----- ASSIGN ROLE FORM ----- */
    const adminRoleForm = document.getElementById('adminRoleForm');
    if (adminRoleForm) {
        adminRoleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const profileId = document.getElementById('roleProfileId').value;
            const roleName = document.getElementById('roleNameInput').value;

            if (!profileId) {
                showToast('warning', 'Missing Field', 'Please select a target user profile.');
                return;
            }

            const res = await apiRequest(`/admin/users/${profileId}/roles`, 'PATCH', { roleName });
            if (res.status === 200) {
                showToast('success', 'Role Assigned', `Role successfully updated.`);
                adminRoleForm.reset();
                loadProfilesForDropdown();
                loadUsers();
            } else {
                showToast('error', 'Assignment Failed', extractErrorMessage(res));
            }
        });
    }

    /* ----- CREATE & PROVISION OFFICER FORM ----- */
    const createOfficerForm = document.getElementById('createOfficerForm');
    if (createOfficerForm) {
        createOfficerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const profileId = document.getElementById('officerTargetProfileId')?.value;
            const accountStatus = document.getElementById('officerAccountStatus')?.value || 'ACTIVE';
            const statusReason = document.getElementById('officerStatusReason')?.value?.trim() || 'Appointed as Field Officer';

            if (!profileId) {
                showToast('warning', 'Selection Required', 'Please select a user profile to promote to Officer.');
                return;
            }

            // Step 1: Assign Officer Role
            const roleRes = await apiRequest(`/admin/users/${profileId}/roles`, 'PATCH', { roleName: 'ROLE_OFFICER' });
            if (roleRes.status !== 200 && roleRes.status !== 204) {
                showToast('error', 'Officer Promotion Failed', extractErrorMessage(roleRes));
                return;
            }

            // Step 2: Set Staff Account Status & Department Note
            const statusRes = await apiRequest('/admin/staff', 'POST', {
                profileId: profileId,
                accountStatus: accountStatus,
                statusReason: statusReason
            });

            if (statusRes.status === 200 || statusRes.status === 201) {
                showToast('success', 'Officer Provisioned', 'User has been promoted to Field Officer and registered.');
            } else {
                showToast('info', 'Officer Promoted', 'Role updated to OFFICER.');
            }
            createOfficerForm.reset();
            await loadProfilesForDropdown();
            loadUsers();
        });
    }

    /* ----- ADD CATEGORY FORM ----- */
    const adminCategoryForm = document.getElementById('adminCategoryForm');
    if (adminCategoryForm) {
        adminCategoryForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const catName = document.getElementById('catName').value.trim();
            const catType = document.getElementById('catType').value;

            if (!catName || !catType) {
                showToast('warning', 'Missing Fields', 'Please fill in the category name and type.');
                return;
            }

            const payload = { categoryName: catName, categoryTypes: catType };

            const res = await apiRequest('/category', 'POST', payload);
            if (res.status === 201 || res.status === 200) {
                showToast('success', 'Category Created', `"${catName}" has been added to the system.`);
                adminCategoryForm.reset();
                loadSystemCategories();
            } else {
                showToast('error', 'Create Failed', extractErrorMessage(res));
            }
        });
    }

    /* ----- MANAGE COMPLAINT FORM ----- */
    const manageComplaintForm = document.getElementById('manageComplaintForm');
    if (manageComplaintForm) {
        manageComplaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const complainId = document.getElementById('mgmtComplainId').value.trim();
            if (!complainId) {
                showToast('warning', 'Missing ID', 'Click "Manage" on a complaint in the table below to load its ID.');
                return;
            }

            const payload = { complainId };

            const status = document.getElementById('mgmtStatus').value;
            if (status) payload.status = status;

            const priority = document.getElementById('mgmtPriority').value;
            if (priority) payload.complainPriority = priority;

            const officerId = document.getElementById('mgmtOfficerId').value.trim();
            if (officerId) payload.assignedOfficerProfileId = officerId;

            const res = await apiRequest('/complains/manage', 'PATCH', payload);
            if (res.status === 200) {
                showToast('success', 'Complaint Updated', 'The complaint has been updated successfully.');
                manageComplaintForm.reset();
                loadAllComplaints();
            } else {
                showToast('error', 'Update Failed', extractErrorMessage(res));
            }
        });
    }
});

/* ===== LOAD ALL CATEGORIES ===== */
async function loadSystemCategories() {
    const container = document.getElementById('categoriesListContainer');
    if (!container) return;
    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const res = await apiRequest('/category', 'GET');
    if (res.status !== 200 || !res.data) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${extractErrorMessage(res)}</p></div>`;
        return;
    }

    const arr = getApiData(res) || [];
    if (arr.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📂</div><p>No categories found. Add one above.</p></div>';
        return;
    }

    let rows = '';
    arr.forEach(c => {
        const shortId = c.id ? c.id.substring(0, 8) + '…' : '—';
        rows += `
            <tr>
                <td title="${c.id}" style="font-family: monospace; font-size: 0.8rem;">${shortId}</td>
                <td>${c.categoryName}</td>
                <td>${c.categoryTypes ? c.categoryTypes.replace(/_/g, ' ') : '—'}</td>
                <td>
                    <button class="btn-danger btn-sm" onclick="deleteCategory('${c.id}', '${c.categoryName}')">🗑️ Delete</button>
                </td>
            </tr>`;
    });

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead><tr><th>ID</th><th>Category Name</th><th>Type</th><th>Action</th></tr></thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

async function deleteCategory(id, name) {
    if (!confirm(`Delete category "${name}"? This may break existing complaints linked to this category.`)) return;
    const res = await apiRequest(`/category/${id}`, 'DELETE');
    if (res.status === 200) {
        showToast('success', 'Category Deleted', `"${name}" has been removed.`);
        loadSystemCategories();
    } else {
        showToast('error', 'Delete Failed', extractErrorMessage(res));
    }
}

/* ===== LOAD ALL COMPLAINTS ===== */
async function loadAllComplaints() {
    const container = document.getElementById('allComplaintsContainer');
    if (!container) return;
    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const res = await apiRequest('/complains', 'GET');
    if (res.status !== 200 || !res.data) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${extractErrorMessage(res)}</p></div>`;
        return;
    }

    const arr = getApiData(res) || [];
    if (arr.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div><p>No complaints in the system yet.</p></div>';
        return;
    }

    let rows = '';
    arr.forEach(c => {
        const statusLabel = c.complainStatus || 'PENDING';
        const priority = c.complainPriority || 'LOW';
        const catName = c.category ? c.category.categoryName : 'N/A';
        const citizen = c.citizenName || '—';
        const officer = c.assignedOfficerName || '—';
        const shortId = c.id ? c.id.substring(0, 8) + '…' : '—';

        rows += `
            <tr>
                <td title="${c.id}" style="font-family: monospace;">${shortId}</td>
                <td>${catName}</td>
                <td style="max-width: 180px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.message}">${c.message}</td>
                <td>${citizen}</td>
                <td>${officer}</td>
                <td><span class="badge ${priority.toLowerCase()}">${priority}</span></td>
                <td><span class="badge ${statusLabel.toLowerCase()}">${statusLabel}</span></td>
                <td>
                    <div style="display: flex; gap: 6px; flex-wrap: nowrap;">
                        <button class="btn-secondary btn-sm" onclick="openComplaintModal('${c.id}')">🔍 Details</button>
                        <button class="btn-secondary btn-sm" onclick="fillManageForm('${c.id}')">✏️ Manage</button>
                        <button class="btn-danger btn-sm" onclick="deleteComplaint('${c.id}')">🗑️</button>
                    </div>
                </td>
            </tr>`;
    });

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th><th>Category</th><th>Message</th><th>Citizen</th><th>Officer</th><th>Priority</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function fillManageForm(complainId) {
    const input = document.getElementById('mgmtComplainId');
    if (input) input.value = complainId;
    // Scroll to top of complaint form
    document.getElementById('manageComplaintForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    showToast('info', 'Complaint Loaded', `Complaint ${complainId.substring(0,8)}… loaded into the manage form above.`);
}

async function deleteComplaint(id) {
    if (!confirm('Permanently delete this complaint? This will also delete associated images from Cloudinary.')) return;
    const res = await apiRequest(`/complains/${id}`, 'DELETE');
    if (res.status === 200) {
        showToast('success', 'Complaint Deleted', 'The complaint and its images have been removed.');
        loadAllComplaints();
    } else {
        showToast('error', 'Delete Failed', extractErrorMessage(res));
    }
}

/* ===== LOAD STAFF MANAGEMENT RECORDS ===== */
async function loadUsers() {
    const container = document.getElementById('usersListContainer');
    if (!container) return;
    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const res = await apiRequest('/admin/users', 'GET');
    if (res.status !== 200 || !res.data) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${extractErrorMessage(res)}</p></div>`;
        return;
    }

    const arr = getApiData(res) || [];
    if (arr.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">👥</div><p>No staff control records found. Use the form above to provision a staff member.</p></div>';
        return;
    }

    const userRoles = JSON.parse(sessionStorage.getItem('userRoles') || '[]');
    const isSuperAdmin = userRoles.includes('ROLE_SUPER_ADMIN');

    let rows = '';
    arr.forEach(u => {
        const status = u.accountStatus || 'N/A';
        const shortId = u.id ? u.id.substring(0, 8) + '…' : '—';

        const actionBtn = isSuperAdmin 
            ? `<button class="btn-danger btn-sm" onclick="deleteStaffRecord('${u.id}')">🗑️ Delete</button>`
            : `<button class="btn-secondary btn-sm" disabled style="opacity:0.4; cursor:not-allowed;" title="Only Super Admin can delete records">🔒 Restricted</button>`;

        rows += `
            <tr>
                <td title="${u.id}" style="font-family: monospace;">${shortId}</td>
                <td>${u.targetUserName || '—'}</td>
                <td><span class="badge ${status.toLowerCase()}">${status}</span></td>
                <td style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${u.statusReason}">${u.statusReason || '—'}</td>
                <td>${u.modifiedBy || '—'}</td>
                <td style="color: var(--text-muted); font-size: 0.78rem;">${u.statusChangedAt ? new Date(u.statusChangedAt).toLocaleDateString() : '—'}</td>
                <td>${actionBtn}</td>
            </tr>`;
    });

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Control ID</th><th>Staff Name</th><th>Status</th><th>Reason</th><th>Modified By</th><th>Changed At</th><th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

async function deleteStaffRecord(id) {
    const userRoles = JSON.parse(sessionStorage.getItem('userRoles') || '[]');
    if (!userRoles.includes('ROLE_SUPER_ADMIN')) {
        showToast('warning', 'Access Denied', 'Only Super Admins can delete staff control records.');
        return;
    }

    if (!confirm('Delete this staff control record? The user account remains but will lose management tracking.')) return;
    const res = await apiRequest(`/admin/users/${id}`, 'DELETE');
    if (res.status === 200 || res.status === 204) {
        showToast('success', 'Record Deleted', 'The staff control record has been removed.');
        loadUsers();
    } else {
        showToast('error', 'Delete Failed', extractErrorMessage(res));
    }
}

async function loadProfilesForDropdown() {
    const res = await apiRequest('/admin/profiles', 'GET');
    const select = document.getElementById('staffProfileId');
    const roleSelect = document.getElementById('roleProfileId');
    const officerSelect = document.getElementById('mgmtOfficerId');
    const roleNameInput = document.getElementById('roleNameInput');
    if (!select && !officerSelect && !roleSelect) return;

    const userRoles = JSON.parse(sessionStorage.getItem('userRoles') || '[]');
    const isSuperAdmin = userRoles.includes('ROLE_SUPER_ADMIN');
    const isManager = userRoles.includes('ROLE_MANAGER') && !isSuperAdmin;

    // If logged in user is a Manager (not Super Admin), restrict assignable roles to OFFICER only
    if (isManager && roleNameInput) {
        roleNameInput.innerHTML = '<option value="ROLE_OFFICER" selected>OFFICER — Field Staff (Manager Scope)</option>';
    }

    if (res.status === 200 && res.data) {
        const arr = getApiData(res) || [];

        // Filter profiles for Manager if applicable (Managers shouldn't re-assign Super Admins or other Managers)
        const filteredProfiles = isManager 
            ? arr.filter(p => !p.roles || (!p.roles.includes('ROLE_SUPER_ADMIN') && !p.roles.includes('ROLE_MANAGER')))
            : arr;

        if (select) {
            select.innerHTML = '<option value="" disabled selected>Select user profile...</option>';
            filteredProfiles.forEach(p => {
                const roleStr = p.roles ? `[${[...p.roles].join(', ').replace(/ROLE_/g, '')}]` : '';
                select.innerHTML += `<option value="${p.id}" style="color: black;">${p.fullName || p.username} (${p.username}) ${roleStr}</option>`;
            });
            if (filteredProfiles.length === 0) {
                select.innerHTML = '<option value="" disabled selected>No editable profiles available</option>';
            }
        }

        if (roleSelect) {
            roleSelect.innerHTML = '<option value="" disabled selected>Select user profile...</option>';
            filteredProfiles.forEach(p => {
                const roleStr = p.roles ? `[${[...p.roles].join(', ').replace(/ROLE_/g, '')}]` : '';
                roleSelect.innerHTML += `<option value="${p.id}" style="color: black;">${p.fullName || p.username} (${p.username}) ${roleStr}</option>`;
            });
            if (filteredProfiles.length === 0) {
                roleSelect.innerHTML = '<option value="" disabled selected>No editable profiles available</option>';
            }
        }

        const officerTargetSelect = document.getElementById('officerTargetProfileId');
        if (officerTargetSelect) {
            officerTargetSelect.innerHTML = '<option value="" disabled selected>Select user profile to promote...</option>';
            filteredProfiles.forEach(p => {
                const roleStr = p.roles ? `[${[...p.roles].join(', ').replace(/ROLE_/g, '')}]` : '[CITIZEN]';
                officerTargetSelect.innerHTML += `<option value="${p.id}" style="color: black;">${p.fullName || p.username} (${p.username}) ${roleStr}</option>`;
            });
            if (filteredProfiles.length === 0) {
                officerTargetSelect.innerHTML = '<option value="" disabled selected>No eligible user profiles available</option>';
            }
        }

        if (officerSelect) {
            officerSelect.innerHTML = '<option value="" selected>— No change / Unassigned —</option>';
            arr.forEach(p => {
                // Strict FE filter: ONLY users with ROLE_OFFICER can be assigned complaints
                const isOfficerOnly = p.roles && p.roles.includes('ROLE_OFFICER');
                if (isOfficerOnly) {
                    officerSelect.innerHTML += `<option value="${p.id}" style="color: black;">👷 ${p.fullName || p.username} (${p.username})</option>`;
                }
            });
        }

        // Render Dedicated Directories
        renderDedicatedDirectory('officersDirectoryContainer', arr.filter(p => p.roles && p.roles.includes('ROLE_OFFICER')), 'No Officers found.');
        
        const mgrCard = document.getElementById('managersDirectoryCard');
        if (isSuperAdmin) {
            if (mgrCard) mgrCard.style.display = 'block';
            renderDedicatedDirectory('managersDirectoryContainer', arr.filter(p => p.roles && (p.roles.includes('ROLE_MANAGER') || p.roles.includes('ROLE_SUPER_ADMIN'))), 'No Managers found.');
        } else {
            if (mgrCard) mgrCard.style.display = 'none';
        }

        renderDedicatedDirectory('citizensDirectoryContainer', arr.filter(p => !p.roles || p.roles.length === 0 || (p.roles.includes('ROLE_CITIZEN') && !p.roles.includes('ROLE_OFFICER') && !p.roles.includes('ROLE_MANAGER') && !p.roles.includes('ROLE_SUPER_ADMIN'))), 'No Citizens found.');

    } else {
        if (select) select.innerHTML = '<option value="" disabled selected>Failed to load profiles</option>';
        if (roleSelect) roleSelect.innerHTML = '<option value="" disabled selected>Failed to load profiles</option>';
        if (officerSelect) officerSelect.innerHTML = '<option value="" disabled>Failed to load officers</option>';
    }
}

function renderDedicatedDirectory(containerId, profileList, emptyText) {
    const container = document.getElementById(containerId);
    if (!container) return;

    if (!profileList || profileList.length === 0) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">👤</div><p>${emptyText}</p></div>`;
        return;
    }

    let rows = '';
    profileList.forEach(p => {
        const roles = p.roles ? [...p.roles].map(r => r.replace('ROLE_', '')).join(', ') : 'CITIZEN';
        const status = p.accountStatus || 'ACTIVE';
        const shortId = p.id ? p.id.substring(0, 8) + '…' : '—';

        rows += `
            <tr>
                <td title="${p.id}" style="font-family: monospace;">${shortId}</td>
                <td><strong>${p.fullName || p.username}</strong></td>
                <td>${p.username}</td>
                <td>${p.email || '—'}</td>
                <td><span class="badge in_progress">${roles}</span></td>
                <td><span class="badge ${status.toLowerCase()}">${status}</span></td>
                <td>
                    <div style="display:flex; gap:6px;">
                        <button class="btn-secondary btn-sm" onclick="quickSelectUserForRole('${p.id}')">🎖️ Role</button>
                        <button class="btn-secondary btn-sm" onclick="quickSelectUserForStatus('${p.id}')">🔒 Status</button>
                    </div>
                </td>
            </tr>`;
    });

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Profile ID</th><th>Full Name</th><th>Username</th><th>Email</th><th>Role</th><th>Status</th><th>Actions</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
}

function quickSelectUserForRole(profileId) {
    const select = document.getElementById('roleProfileId');
    if (select) {
        select.value = profileId;
        document.getElementById('adminRoleForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('info', 'User Selected', 'Target user loaded into Assign Role form.');
    }
}

function quickSelectUserForStatus(profileId) {
    const select = document.getElementById('staffProfileId');
    if (select) {
        select.value = profileId;
        document.getElementById('adminUserForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        showToast('info', 'User Selected', 'Target user loaded into Account Status form.');
    }
}