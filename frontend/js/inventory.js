// State
let products = [];
const modal = document.getElementById('productModal');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Mobile Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    function toggleSidebar() {
        if (!sidebar || !sidebarOverlay) return;
        const isOpen = sidebar.classList.contains('open');
        if (isOpen) {
            sidebar.classList.remove('open');
            setTimeout(() => {
                sidebarOverlay.classList.remove('show');
            }, 300);
        } else {
            sidebar.classList.add('open');
            sidebarOverlay.classList.add('show');
        }
    }

    if (openSidebarBtn) openSidebarBtn.addEventListener('click', toggleSidebar);
    if (closeSidebarBtn) closeSidebarBtn.addEventListener('click', toggleSidebar);
    if (sidebarOverlay) sidebarOverlay.addEventListener('click', toggleSidebar);

    await loadInventory();
});

async function loadInventory() {
    try {
        products = await fetchAPI('/products/');
        renderInventory();
        document.getElementById('loadingIndicator').classList.add('hidden');
    } catch (error) {
        document.getElementById('loadingIndicator').textContent = "Failed to load inventory.";
        document.getElementById('loadingIndicator').className = "text-center p-md text-red";
    }
}

function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = '';

    const icons = ['cookie', 'light_mode', 'menu_book', 'wine_bar', 'cleaning_services', 'inventory_2'];
    const colorClasses = ['icon-green', 'icon-emerald', 'icon-teal', 'icon-lime', 'icon-green-dark', 'icon-slate'];

    products.forEach(p => {
        const iconIndex = p.id % icons.length;
        const outOfStock = p.stock_quantity <= 0;
        const stockClass = outOfStock ? 'stock-out' : 'stock-ok';

        const html = `
        <div class="inv-row">
            <div class="inv-row-inner">
                <div class="inv-col-1 desktop-only text-light text-sm">#${p.id}</div>
                <div class="inv-col-4 flex-row gap-lg">
                    <div class="inv-icon ${colorClasses[iconIndex]}">
                        <span class="material-symbols-outlined">${icons[iconIndex]}</span>
                    </div>
                    <div>
                        <h3 class="semibold text-dark">${p.name}</h3>
                        <p class="text-xs text-light mt-sm mobile-only">ID: #${p.id}</p>
                    </div>
                </div>
                <div class="inv-col-2 text-center">
                    <span class="mobile-only text-xs text-muted">Stock: </span>
                    <span class="stock-badge ${stockClass}">${p.stock_quantity}</span>
                </div>
                <div class="inv-col-2 text-center desktop-only text-sm text-light">${p.unit}</div>
                <div class="inv-col-2 text-right medium text-dark">${formatCurrency(p.price)}</div>
                <div class="inv-col-1" style="display:flex; justify-content:flex-end;">
                    <button onclick="editProduct(${p.id})" class="btn-icon-sm" style="color:var(--text-muted);">
                        <span class="material-symbols-outlined" style="font-size:20px;">edit</span>
                    </button>
                </div>
            </div>
        </div>
        `;
        list.insertAdjacentHTML('beforeend', html);
    });
}

function openAddModal() {
    document.getElementById('productId').value = '';
    document.getElementById('productName').value = '';
    document.getElementById('productStock').value = '';
    document.getElementById('productUnit').value = '';
    document.getElementById('productPrice').value = '';
    document.getElementById('modalTitle').textContent = 'Add Product';

    modal.classList.add('show');
}

function editProduct(id) {
    const p = products.find(prod => prod.id === id);
    if (!p) return;

    document.getElementById('productId').value = p.id;
    document.getElementById('productName').value = p.name;
    document.getElementById('productStock').value = p.stock_quantity;
    document.getElementById('productUnit').value = p.unit;
    document.getElementById('productPrice').value = p.price;
    document.getElementById('modalTitle').textContent = 'Edit Product';

    modal.classList.add('show');
}

function closeModal() {
    modal.classList.remove('show');
}

async function saveProduct(e) {
    e.preventDefault();

    const pId = document.getElementById('productId').value;
    const payload = {
        name: document.getElementById('productName').value,
        stock_quantity: document.getElementById('productStock').value,
        unit: document.getElementById('productUnit').value,
        price: document.getElementById('productPrice').value
    };

    try {
        if (pId) {
            await fetchAPI(`/products/${pId}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            await fetchAPI(`/products/`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        closeModal();
        await loadInventory();
    } catch (err) {
        alert("Failed to save. Check console.");
    }
}
