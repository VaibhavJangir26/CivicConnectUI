/* ===== CITIZEN.JS — Fully aligned with backend DTOs ===== */

document.addEventListener('DOMContentLoaded', async () => {
    // Pre-load categories for the dropdown
    await loadCategoriesForDropdown();
    // Load complaints list
    loadMyComplaints();

    /* ----- FILE COMPLAINT FORM ----- */
    const complaintForm = document.getElementById('complaintForm');
    if (complaintForm) {
        complaintForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const message = document.getElementById('compMessage').value.trim();
            const categoryId = document.getElementById('compCategory').value;
            const priority = document.getElementById('compPriority').value;
            const addressLine = document.getElementById('compAddressLine').value.trim();
            const city = document.getElementById('compCity').value.trim();
            const state = document.getElementById('compState').value.trim();
            const pincode = document.getElementById('compPincode').value.trim();
            const country = document.getElementById('compCountry').value.trim() || 'India';

            if (!categoryId) {
                showToast('warning', 'Required Field', 'Please select a category for your complaint.');
                return;
            }
            if (!message) {
                showToast('warning', 'Required Field', 'Please describe the issue.');
                return;
            }

            // Build ComplainRequestDTO as JSON blob
            const complainData = {
                message,
                categoryId,
                complainPriority: priority,
                address: {
                    addressLine: addressLine || 'Not Provided',
                    city: city || 'Not Provided',
                    state: state || 'Not Provided',
                    pincode: pincode || '000000',
                    country: country
                }
            };

            const formData = new FormData();
            formData.append('complainData', new Blob([JSON.stringify(complainData)], { type: 'application/json' }));

            // Attach optional images
            const imageInput = document.getElementById('compImages');
            if (imageInput && imageInput.files.length > 0) {
                Array.from(imageInput.files).forEach(file => formData.append('images', file));
            }

            const res = await apiRequest('/complains', 'POST', formData, true);
            if (res.status === 201 || res.status === 200) {
                showToast('success', 'Complaint Submitted', 'Your complaint has been filed and is now PENDING review.');
                complaintForm.reset();
                // Reset file label
                const fileText = document.getElementById('compFileText');
                if (fileText) fileText.textContent = 'Click or drag images here';
                loadMyComplaints();
                switchViewTab('my-list');
            } else {
                showToast('error', 'Submission Failed', extractErrorMessage(res));
            }
        });
    }

    /* ----- PROFILE UPDATE FORM ----- */
    const updateProfileForm = document.getElementById('updateProfileForm');
    if (updateProfileForm) {
        updateProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const payload = {
                fullName: document.getElementById('profFullName').value.trim() || null,
                mobileNo: document.getElementById('profMobileNo').value.trim() || null,
                dob: document.getElementById('profDob').value || null,
                address: {
                    addressLine: document.getElementById('profAddressLine').value.trim() || null,
                    city: document.getElementById('profCity').value.trim() || null,
                    state: document.getElementById('profState').value.trim() || null,
                    pincode: document.getElementById('profPincode').value.trim() || null,
                    country: document.getElementById('profCountry').value.trim() || null
                }
            };

            // Remove null address if all fields are null
            const hasAddress = Object.values(payload.address).some(v => v !== null);
            if (!hasAddress) delete payload.address;

            const res = await apiRequest('/profile/me', 'PUT', payload);
            if (res.status === 200) {
                showToast('success', 'Profile Updated', 'Your profile has been saved successfully.');
                await loadProfileData();
            } else {
                showToast('error', 'Update Failed', extractErrorMessage(res));
            }
        });
    }
});

/* ===== LOAD CATEGORIES FOR DROPDOWN ===== */
async function loadCategoriesForDropdown() {
    const res = await apiRequest('/category', 'GET');
    const select = document.getElementById('compCategory');
    if (!select) return;

    if (res.status === 200 && res.data) {
        const arr = getApiData(res) || [];
        select.innerHTML = '<option value="" disabled selected>Select a category...</option>';
        arr.forEach(c => {
            select.innerHTML += `<option value="${c.id}" style="color: black;">${c.categoryName} — ${c.categoryTypes ? c.categoryTypes.replace(/_/g,' ') : ''}</option>`;
        });
        if (arr.length === 0) {
            select.innerHTML = '<option value="" disabled selected>No categories available</option>';
        }
    } else {
        select.innerHTML = '<option value="" disabled selected>Failed to load categories</option>';
    }
}

/* ===== LOAD MY COMPLAINTS TABLE ===== */
async function loadMyComplaints(page = 0) {
    const container = document.getElementById('myComplaintsTableContainer');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const res = await apiRequest(`/complains?page=${page}&size=10`, 'GET');
    if (res.status !== 200 || !res.data) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${extractErrorMessage(res)}</p></div>`;
        return;
    }

    const pageData = getApiData(res);
    if (!pageData) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load complaints data format.</p></div>`;
        return;
    }

    const arr = Array.isArray(pageData) ? pageData : (pageData.content || []);
    const totalPages = pageData.totalPages || 1;
    const currentPage = pageData.pageNumber || 0;

    if (arr.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📭</div>
                <p>No complaints filed yet. <a style="color: var(--indigo); cursor: pointer;" onclick="switchViewTab('file-complaint')">File your first complaint →</a></p>
            </div>`;
        return;
    }

    let rows = '';
    arr.forEach(c => {
        const catName = c.category ? c.category.categoryName : 'N/A';
        const statusLabel = c.complainStatus || 'PENDING';
        const priority = c.complainPriority || 'LOW';

        // Build image gallery
        let galleryHtml = '<div class="image-gallery">';
        if (c.imageUrls && c.imageUrls.length > 0) {
            c.imageUrls.forEach(url => {
                galleryHtml += `<a href="${url}" target="_blank"><img src="${url}" title="Your upload" /></a>`;
            });
        }
        if (c.proofImageUrls && c.proofImageUrls.length > 0) {
            c.proofImageUrls.forEach(url => {
                galleryHtml += `<a href="${url}" target="_blank"><img src="${url}" class="proof" title="Officer proof" /></a>`;
            });
        }
        if (!c.imageUrls?.length && !c.proofImageUrls?.length) {
            galleryHtml += '<span class="no-images">—</span>';
        }
        galleryHtml += '</div>';

        const shortId = c.id ? c.id.substring(0, 8) + '...' : 'N/A';

        rows += `
            <tr>
                <td title="${c.id}">${shortId}</td>
                <td>${catName}</td>
                <td style="max-width:220px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.message}">${c.message}</td>
                <td><span class="badge ${priority.toLowerCase()}">${priority}</span></td>
                <td>${galleryHtml}</td>
                <td><span class="badge ${statusLabel.toLowerCase()}">${statusLabel}</span></td>
                <td style="color: var(--text-muted); font-size: 0.78rem;">${c.assignedOfficerName ? `👷 ${c.assignedOfficerName}` : '—'}</td>
                <td>
                    <button class="btn-secondary btn-sm" onclick="openComplaintModal('${c.id}')">🔍 Details</button>
                </td>
            </tr>`;
    });

    container.innerHTML = `
        <div class="table-wrapper">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Category</th>
                        <th>Message</th>
                        <th>Priority</th>
                        <th>Images</th>
                        <th>Status</th>
                        <th>Officer</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${buildPaginationHtml(currentPage, totalPages, 'switchCitizenPage')}`;

    // Also populate recent activity on dashboard
    const recentContainer = document.getElementById('recentActivityContainer');
    if (recentContainer) {
        const recent = arr.slice(0, 3);
        if (recent.length === 0) return;
        let recentHtml = '<div class="table-wrapper"><table class="data-table"><thead><tr><th>Category</th><th>Status</th><th>Priority</th></tr></thead><tbody>';
        recent.forEach(c => {
            const s = c.complainStatus || 'PENDING';
            const p = c.complainPriority || 'LOW';
            recentHtml += `<tr><td>${c.category ? c.category.categoryName : '—'}</td><td><span class="badge ${s.toLowerCase()}">${s}</span></td><td><span class="badge ${p.toLowerCase()}">${p}</span></td></tr>`;
        });
        recentHtml += '</tbody></table></div>';
        recentContainer.innerHTML = recentHtml;
    }
}

// Global callback for switching citizen complaint pages
window.switchCitizenPage = function(pageNumber) {
    loadMyComplaints(pageNumber);
};