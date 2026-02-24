// State
let products = [];
const modal = document.getElementById('productModal');

// Init
document.addEventListener('DOMContentLoaded', async () => {
    await loadInventory();
});

async function loadInventory() {
    try {
        products = await fetchAPI('/products/');
        renderInventory();
        document.getElementById('loadingIndicator').classList.add('hidden');
    } catch (error) {
        document.getElementById('loadingIndicator').textContent = "Failed to load inventory.";
        document.getElementById('loadingIndicator').className = "text-center py-10 text-red-500";
    }
}

function renderInventory() {
    const list = document.getElementById('inventoryList');
    list.innerHTML = '';

    // Assign random icons based on ID for visual flair
    const icons = ['cookie', 'light_mode', 'menu_book', 'wine_bar', 'cleaning_services', 'inventory_2'];
    const colors = ['bg-green-50 text-green-700', 'bg-emerald-50 text-emerald-700', 'bg-teal-50 text-teal-700', 'bg-lime-50 text-lime-700', 'bg-green-100 text-green-800', 'bg-slate-50 text-slate-600'];

    products.forEach(p => {
        const iconIndex = p.id % icons.length;
        const outOfStock = p.stock_quantity <= 0;
        const stockColor = outOfStock ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700';

        const html = `
        <div class="group bg-white dark:bg-[#111618] rounded-xl p-4 border border-slate-200 dark:border-slate-800 hover:border-primary/50 transition-all shadow-sm">
            <div class="flex items-center justify-between md:grid md:grid-cols-12 md:gap-4">
                <div class="md:col-span-1 hidden md:block text-slate-500 text-sm">#${p.id}</div>
                <div class="flex items-center gap-4 md:col-span-4">
                    <div class="size-10 rounded-lg ${colors[iconIndex]} flex items-center justify-center shrink-0">
                        <span class="material-symbols-outlined">${icons[iconIndex]}</span>
                    </div>
                    <div>
                        <h3 class="font-semibold text-slate-900 dark:text-white leading-tight">${p.name}</h3>
                        <p class="text-xs text-slate-500 mt-0.5 md:hidden">ID: #${p.id}</p>
                    </div>
                </div>
                <div class="flex flex-col items-end md:items-center md:flex-row md:contents">
                    <div class="md:col-span-2 md:text-center mt-2 md:mt-0">
                        <span class="text-xs text-slate-400 md:hidden mr-1">Stock:</span>
                        <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${stockColor}">
                            ${p.stock_quantity}
                        </span>
                    </div>
                    <div class="md:col-span-2 md:text-center hidden md:block text-sm text-slate-500">${p.unit}</div>
                    <div class="md:col-span-2 md:text-right font-medium text-slate-900 dark:text-white mt-1 md:mt-0">${formatCurrency(p.price)}</div>
                </div>
                <div class="md:col-span-1 flex justify-end">
                    <button onclick="editProduct(${p.id})" class="size-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-primary transition-colors">
                        <span class="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    ${!outOfStock ? `
                     <!--  Optional Add to stock quick button if you wanted it later  -->
                    ` : ''}
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

    modal.classList.remove('hidden');
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

    modal.classList.remove('hidden');
}

function closeModal() {
    modal.classList.add('hidden');
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
            // Update
            await fetchAPI(`/products/${pId}/`, {
                method: 'PUT',
                body: JSON.stringify(payload)
            });
        } else {
            // Create
            await fetchAPI(`/products/`, {
                method: 'POST',
                body: JSON.stringify(payload)
            });
        }
        closeModal();
        await loadInventory(); // refresh list
    } catch (err) {
        alert("Failed to save. Check console.");
    }
}
