// State
let wards = [];
let families = [];

// DOM Elements
const wardsList = document.getElementById('wardsList');
const familiesListContainer = document.getElementById('familiesListContainer');
const familiesCount = document.getElementById('familiesCount');
const familySearch = document.getElementById('familySearch');
const familyModal = document.getElementById('familyModal');
const modalWardSelect = document.getElementById('modalWardSelect');

document.addEventListener('DOMContentLoaded', async () => {
    await loadData();

    // Setup Search debounce
    let searchTimeout;
    if (familySearch) {
        familySearch.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                loadFamilies(e.target.value);
            }, 300);
        });
    }
});

async function loadData() {
    try {
        await loadWards();
        await loadFamilies();
    } catch (e) {
        console.error("Error loading data", e);
    }
}

async function loadWards() {
    try {
        wards = await fetchAPI('/wards/');
        renderWards();
        populateWardSelects();
    } catch (e) {
        wardsList.innerHTML = '<div class="text-center text-red" style="padding:16px;">Failed to load wards</div>';
    }
}

async function loadFamilies(searchQuery = '') {
    try {
        let url = '/families/';
        if (searchQuery) {
            url += `?search=${encodeURIComponent(searchQuery)}`;
        }
        families = await fetchAPI(url);
        renderFamilies();
    } catch (e) {
        familiesListContainer.innerHTML = '<div class="text-center text-red" style="padding:40px 0;">Failed to load families</div>';
    }
}

function renderWards() {
    wardsList.innerHTML = '';

    if (wards.length === 0) {
        wardsList.innerHTML = '<div class="text-center text-light text-sm" style="padding:16px;">No wards created yet.</div>';
        return;
    }

    wards.forEach(ward => {
        const wFamilies = families.filter(f => f.ward === ward.id);

        const html = `
        <div class="ward-item">
            <div class="flex-between mb-sm">
                <span class="ward-name">${ward.ward_name}</span>
                <span class="text-xs text-light" style="background:var(--slate-100); padding:2px 8px; border-radius:var(--radius-full);">${ward.ward_number}</span>
            </div>
            <div class="ward-meta">

            </div>
        </div>
        `;
        wardsList.insertAdjacentHTML('beforeend', html);
    });
}

function renderFamilies() {
    familiesListContainer.innerHTML = '';
    familiesCount.textContent = families.length;

    if (families.length === 0) {
        familiesListContainer.innerHTML = '<div class="text-center text-light" style="padding:40px 0;">No families found.</div>';
        return;
    }

    // Group families by ward
    const familiesByWard = {};
    wards.forEach(w => { familiesByWard[w.id] = []; });
    familiesByWard['unassigned'] = [];

    families.forEach(f => {
        if (familiesByWard[f.ward]) {
            familiesByWard[f.ward].push(f);
        } else {
            familiesByWard['unassigned'].push(f);
        }
    });

    const avatarColors = ['avatar-blue', 'avatar-green', 'avatar-orange', 'avatar-purple'];

    Object.keys(familiesByWard).forEach((wardId) => {
        const wardFamilies = familiesByWard[wardId];
        if (wardFamilies.length === 0) return;

        const ward = wards.find(w => w.id.toString() === wardId);
        const wardName = ward ? ward.ward_name : 'Unknown Ward';

        let html = `
        <details class="family-group" style="margin-bottom: 16px; background: var(--white); border-radius: var(--radius-xl); border: 1px solid var(--border-green); box-shadow: var(--shadow-sm); overflow: hidden;">
            <summary class="family-group-header" style="cursor: pointer; list-style: none; outline: none; padding: 16px; border-bottom: 1px solid var(--border-green); background: var(--slate-50); display: flex; justify-content: space-between; align-items: center; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='var(--accent)'" onmouseout="this.style.backgroundColor='var(--slate-50)'">
                <div class="flex-row gap-sm">
                    <span class="material-symbols-outlined text-light">location_on</span>
                    <h4 class="bold text-dark" style="margin: 0;">${wardName}</h4>
                </div>
                <div class="flex-row gap-sm" style="align-items: center;">
                    <span class="text-xs medium text-light uppercase">${wardFamilies.length} Families</span>
                    <span class="material-symbols-outlined text-muted" style="transition: transform 0.2s;">expand_more</span>
                </div>
            </summary>
            <div style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
        `;

        wardFamilies.forEach(f => {
            const initial = f.family_name ? f.family_name.charAt(0).toUpperCase() : '?';
            const colorClass = avatarColors[f.id % avatarColors.length];

            html += `
                <div class="family-row" style="padding: 12px; border-radius: var(--radius-lg); border: 1px solid var(--border-green); transition: all 0.2s;">
                    <div class="flex-row gap-lg">
                        <div class="avatar ${colorClass}">
                            ${initial}
                        </div>
                        <div>
                            <p class="family-name bold text-dark" style="margin: 0 0 4px 0;">${f.family_name}</p>
                            <p class="family-meta text-sm text-light" style="margin: 0;">Head: ${f.head_name} | ${f.phone_number}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        </details>
        `;

        familiesListContainer.insertAdjacentHTML('beforeend', html);
    });
}

function populateWardSelects() {
    if (!modalWardSelect) return;

    modalWardSelect.innerHTML = '<option value="">Select a Ward...</option>';
    wards.forEach(w => {
        modalWardSelect.insertAdjacentHTML('beforeend', `<option value="${w.id}">${w.ward_name} (${w.ward_number})</option>`);
    });
}

// Modals and Forms
function openFamilyModal() {
    familyModal.classList.add('show');
}

function closeFamilyModal() {
    familyModal.classList.remove('show');
}

async function saveWard(e) {
    e.preventDefault();
    const payload = {
        ward_number: document.getElementById('wardNumber').value,
        ward_name: document.getElementById('wardName').value
    };

    try {
        await fetchAPI('/wards/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        document.getElementById('wardNumber').value = '';
        document.getElementById('wardName').value = '';
        await loadWards();
        renderFamilies();

        alert("Ward created successfully!");
    } catch (err) {
        alert("Failed to create ward. Number might not be unique.");
    }
}

async function saveFamily(e) {
    e.preventDefault();

    const payload = {
        family_name: document.getElementById('familyName').value,
        head_name: document.getElementById('headName').value,
        phone_number: document.getElementById('phoneNumber').value,
        ward: document.getElementById('modalWardSelect').value
    };

    try {
        await fetchAPI('/families/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        document.getElementById('familyName').value = '';
        document.getElementById('headName').value = '';
        document.getElementById('phoneNumber').value = '';
        document.getElementById('modalWardSelect').value = '';
        closeFamilyModal();

        await loadData();
        alert("Family registered successfully!");
    } catch (err) {
        alert(err.message || "Failed to register family.");
    }
}
