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
    // Mobile Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    function toggleSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        const isClosed = sidebar.classList.contains('-translate-x-full');
        if (isClosed) {
            sidebar.classList.remove('-translate-x-full');
            sidebarOverlay.classList.remove('hidden');
        } else {
            sidebar.classList.add('-translate-x-full');
            setTimeout(() => {
                sidebarOverlay.classList.add('hidden');
            }, 300);
        }
    }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

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
        await Promise.all([loadWards(), loadFamilies()]);
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
        wardsList.innerHTML = '<div class="p-4 text-center text-red-500">Failed to load wards</div>';
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
        familiesListContainer.innerHTML = '<div class="text-center py-10 text-red-500">Failed to load families</div>';
    }
}

function renderWards() {
    wardsList.innerHTML = '';

    if (wards.length === 0) {
        wardsList.innerHTML = '<div class="p-4 text-center text-text-secondary">No wards created yet.</div>';
        return;
    }

    wards.forEach(ward => {
        // Find family count locally
        const wFamilies = families.filter(f => f.ward === ward.id);

        const html = `
        <div class="p-4 hover:bg-background-dark/50 transition-colors cursor-pointer group">
            <div class="flex justify-between items-center mb-1">
                <span class="text-white font-medium group-hover:text-primary transition-colors">${ward.ward_name}</span>
                <span class="text-xs bg-border-dark text-text-secondary px-2 py-0.5 rounded-full">${ward.ward_number}</span>
            </div>
            <div class="flex items-center gap-2 text-xs text-text-secondary">
                <span class="material-symbols-outlined text-[14px]">groups</span>
                ${wFamilies.length} Families Registered
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
        familiesListContainer.innerHTML = '<div class="text-center py-10 text-text-secondary">No families found.</div>';
        return;
    }

    // Group families by ward
    const familiesByWard = {};
    wards.forEach(w => { familiesByWard[w.id] = []; });

    // Fallback for families without a matching ward in state
    familiesByWard['unassigned'] = [];

    families.forEach(f => {
        if (familiesByWard[f.ward]) {
            familiesByWard[f.ward].push(f);
        } else {
            familiesByWard['unassigned'].push(f);
        }
    });

    const colors = ['from-blue-500 to-indigo-600', 'from-emerald-500 to-teal-600', 'from-orange-500 to-red-600', 'from-purple-500 to-pink-600'];

    Object.keys(familiesByWard).forEach((wardId) => {
        const wardFamilies = familiesByWard[wardId];
        if (wardFamilies.length === 0) return;

        const ward = wards.find(w => w.id.toString() === wardId);
        const wardName = ward ? ward.ward_name : 'Unknown Ward';

        let html = `
        <div class="bg-surface-dark border border-border-dark rounded-xl overflow-hidden mb-6">
            <div class="px-5 py-3 bg-border-dark/30 border-b border-border-dark flex items-center justify-between">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-text-secondary">location_on</span>
                    <h4 class="text-white font-bold">${wardName}</h4>
                </div>
                <span class="text-xs font-medium text-text-secondary uppercase tracking-wider">${wardFamilies.length} Families</span>
            </div>
            <div class="divide-y divide-border-dark">
        `;

        wardFamilies.forEach(f => {
            const initial = f.family_name ? f.family_name.charAt(0).toUpperCase() : '?';
            const colorClass = colors[f.id % colors.length];

            html += `
                <div class="p-4 flex items-center justify-between hover:bg-background-dark/50 transition-colors group">
                    <div class="flex items-center gap-4">
                        <div class="w-10 h-10 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-bold text-sm shadow-md">
                            ${initial}
                        </div>
                        <div>
                            <p class="text-slate-800 font-bold group-hover:text-primary transition-colors">The ${f.family_name} Family</p>
                            <p class="text-text-secondary text-xs">Head: ${f.head_name} | ${f.phone_number}</p>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `
            </div>
        </div>
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
    familyModal.classList.remove('hidden');
    familyModal.classList.add('flex');
}

function closeFamilyModal() {
    familyModal.classList.add('hidden');
    familyModal.classList.remove('flex');
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

        // Reset and Reload
        document.getElementById('wardNumber').value = '';
        document.getElementById('wardName').value = '';
        await loadWards();
        renderFamilies(); // Re-render to update grouping headers if needed

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

        // Reset and Reload
        document.getElementById('familyName').value = '';
        document.getElementById('headName').value = '';
        document.getElementById('phoneNumber').value = '';
        document.getElementById('modalWardSelect').value = '';
        closeFamilyModal();

        await loadData();
        alert("Family registered successfully!");
    } catch (err) {
        alert("Failed to register family.");
    }
}
