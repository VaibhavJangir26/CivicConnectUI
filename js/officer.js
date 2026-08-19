/* ===== OFFICER.JS — Fully aligned with backend DTOs ===== */

document.addEventListener('DOMContentLoaded', async () => {
    await loadAssignedTasks();

    const taskForm = document.getElementById('taskForm');
    if (taskForm) {
        taskForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            await commitStatusUpdate();
        });
    }
});

/* ===== LOAD ASSIGNED TASKS ===== */
async function loadAssignedTasks(page = 0) {
    const container = document.getElementById('assignedTasksContainer');
    const select = document.getElementById('taskComplaintId');
    if (!container) return;

    container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';

    const res = await apiRequest(`/complains?page=${page}&size=10`, 'GET');
    if (res.status !== 200 || !res.data) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>${extractErrorMessage(res)}</p></div>`;
        if (select) select.innerHTML = '<option value="" disabled selected>Failed to load tickets</option>';
        return;
    }

    const pageData = getApiData(res);
    if (!pageData) {
        container.innerHTML = `<div class="empty-state"><div class="empty-icon">⚠️</div><p>Failed to load assigned tasks data format.</p></div>`;
        return;
    }

    const arr = Array.isArray(pageData) ? pageData : (pageData.content || []);
    const totalPages = pageData.totalPages || 1;
    const currentPage = pageData.pageNumber || 0;

    // Populate select dropdown for task update form
    if (select) {
        if (arr.length === 0) {
            select.innerHTML = '<option value="" disabled selected>No assigned tickets available</option>';
        } else {
            select.innerHTML = '<option value="" disabled selected>Select an assigned complaint...</option>';
            arr.forEach(c => {
                const catName = c.category ? c.category.categoryName : 'Complaint';
                const msgSnippet = c.message ? (c.message.length > 30 ? c.message.substring(0, 30) + '…' : c.message) : 'No msg';
                const status = c.complainStatus || 'PENDING';
                select.innerHTML += `<option value="${c.id}" style="color: black;">${catName}: "${msgSnippet}" [${status}]</option>`;
            });
        }
    }

    if (arr.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">📋</div>
                <p>No assigned tasks. Tasks will appear here once a manager assigns complaints to you.</p>
            </div>`;
        return;
    }

    let rows = '';
    arr.forEach(c => {
        const statusLabel = c.complainStatus || 'PENDING';
        const priority = c.complainPriority || 'LOW';
        const catName = c.category ? c.category.categoryName : 'N/A';
        const citizen = c.citizenName || '—';
        const shortId = c.id ? c.id.substring(0, 8) + '…' : '—';

        // Image gallery — show citizen images
        let gallery = '<div class="image-gallery">';
        if (c.imageUrls && c.imageUrls.length > 0) {
            c.imageUrls.forEach(url => {
                gallery += `<a href="${url}" target="_blank"><img src="${url}" title="Citizen evidence" /></a>`;
            });
        } else {
            gallery += '<span class="no-images">—</span>';
        }
        gallery += '</div>';

        // Proof gallery
        let proofGallery = '<div class="image-gallery">';
        if (c.proofImageUrls && c.proofImageUrls.length > 0) {
            c.proofImageUrls.forEach(url => {
                proofGallery += `<a href="${url}" target="_blank"><img src="${url}" class="proof" title="Officer proof" /></a>`;
            });
        } else {
            proofGallery += '<span class="no-images">—</span>';
        }
        proofGallery += '</div>';

        rows += `
            <tr>
                <td title="${c.id}">${shortId}</td>
                <td>${catName}</td>
                <td style="max-width:200px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${c.message}">${c.message}</td>
                <td>${citizen}</td>
                <td><span class="badge ${priority.toLowerCase()}">${priority}</span></td>
                <td>${gallery}</td>
                <td>${proofGallery}</td>
                <td><span class="badge ${statusLabel.toLowerCase()}">${statusLabel}</span></td>
                <td>
                    <div style="display: flex; gap: 6px; flex-wrap: nowrap;">
                        <button class="btn-secondary btn-sm" onclick="openComplaintModal('${c.id}')">🔍 Details</button>
                        <button class="btn-secondary btn-sm" onclick="fillTaskForm('${c.id}')">✏️ Update</button>
                    </div>
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
                        <th>Citizen</th>
                        <th>Priority</th>
                        <th>Evidence</th>
                        <th>Proof</th>
                        <th>Status</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
        ${buildPaginationHtml(currentPage, totalPages, 'switchOfficerPage')}`;
}

window.switchOfficerPage = function(pageNumber) {
    loadAssignedTasks(pageNumber);
};

/* ===== FILL TASK FORM ===== */
function fillTaskForm(complaintId) {
    const select = document.getElementById('taskComplaintId');
    if (select) select.value = complaintId;
    switchViewTab('tasks');
    showToast('info', 'Complaint Selected', `Complaint has been selected. Choose the new status and click Commit.`);
}

/* ===== COMMIT STATUS UPDATE ===== */
async function commitStatusUpdate() {
    const complaintId = document.getElementById('taskComplaintId')?.value?.trim();
    const status = document.getElementById('taskStatus')?.value;

    if (!complaintId) {
        showToast('warning', 'Missing Selection', 'Please select an assigned complaint from the dropdown or click "Update" in the queue.');
        return;
    }
    if (!status) {
        showToast('warning', 'Missing Status', 'Please select the target status.');
        return;
    }

    // Build ComplainUpdateRequestLowLevelDTO as JSON blob
    const updateData = { complainId: complaintId, complainStatus: status };
    const formData = new FormData();
    formData.append('updateData', new Blob([JSON.stringify(updateData)], { type: 'application/json' }));

    // Attach proof images (only saved by backend if status === COMPLETED)
    const proofInput = document.getElementById('proofImages');
    if (proofInput && proofInput.files.length > 0) {
        Array.from(proofInput.files).forEach(file => formData.append('proofImages', file));
    }

    const res = await apiRequest('/complains/status', 'PATCH', formData, true);
    if (res.status === 200) {
        showToast('success', 'Status Updated', `Ticket status updated to ${status}.`);
        document.getElementById('taskForm')?.reset();
        const proofText = document.getElementById('proofFileText');
        if (proofText) proofText.textContent = 'Click or drag proof images here';
        await loadAssignedTasks();
        switchViewTab('dashboard');
    } else {
        showToast('error', 'Update Failed', extractErrorMessage(res));
    }
}