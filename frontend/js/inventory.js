// State
let products = [];
const modal = document.getElementById('productModal');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await loadInventory();

    // Setup Search Listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            if (!query) {
                renderInventory(products);
                return;
            }
            const filtered = products.filter(p =>
                p.name.toLowerCase().includes(query) ||
                p.id.toString().includes(query)
            );
            renderInventory(filtered);
        });
    }
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

function renderInventory(itemsToRender = products) {
    const list = document.getElementById('inventoryList');
    list.innerHTML = '';

    const icons = ['cookie', 'light_mode', 'menu_book', 'wine_bar', 'cleaning_services', 'inventory_2'];
    const colorClasses = ['icon-green', 'icon-emerald', 'icon-teal', 'icon-lime', 'icon-green-dark', 'icon-slate'];

    if (itemsToRender.length === 0) {
        list.innerHTML = '<div class="text-center p-md text-muted">No products found matching your search.</div>';
        return;
    }

    itemsToRender.forEach(p => {
        const iconIndex = p.id % icons.length;
        const outOfStock = p.stock_quantity <= 0;
        const stockClass = outOfStock ? 'stock-out' : 'stock-ok';

        const html = `
        <div class="inv-row" style="margin-bottom: 12px;">
            <div class="inv-row-inner flex-row">
                <div class="inv-col-1 desktop-only text-light text-sm" style="margin-right: 16px;">#${p.id}</div>
                <div class="inv-col-4 flex-row gap-lg" style="flex: 1; min-width: 0; margin-right: 16px;">
                    <div class="inv-icon ${colorClasses[iconIndex]} shrink-0">
                        <span class="material-symbols-outlined">${icons[iconIndex]}</span>
                    </div>
                    <div style="flex: 1; min-width: 0;">
                        <h3 class="semibold text-dark truncate">${p.name}</h3>
                        <p class="text-xs text-light mt-sm mobile-only">ID: #${p.id}</p>
                    </div>
                </div>
                <div class="inv-col-2 text-center" style="margin-right: 16px; white-space: nowrap; flex-shrink: 0;">
                    <span class="mobile-only text-xs text-muted">Stock: </span>
                    <span class="stock-badge ${stockClass}">${p.stock_quantity}</span>
                </div>
                <div class="inv-col-2 text-center desktop-only text-sm text-light" style="margin-right: 16px; flex-shrink: 0;">${p.unit}</div>
                <div class="inv-col-2 text-right medium text-dark" style="margin-right: 16px; white-space: nowrap; flex-shrink: 0;">${formatCurrency(p.price)}</div>
                <div class="inv-col-1 shrink-0" style="display:flex; justify-content:flex-end;">
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
        alert(err.message || "Failed to save. Check console.");
    }
}
