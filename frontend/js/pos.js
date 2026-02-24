// State
let products = [];
let cart = [];
let families = [];

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const familySelect = document.getElementById('familySelect');
const completeBillBtn = document.getElementById('completeBillBtn');
const successModal = document.getElementById('successModal');
const whatsappLink = document.getElementById('whatsappLink');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const cartSheet = document.getElementById('cartSheet');
const cartHeaderToggle = document.getElementById('cartHeaderToggle');
const cartHandle = document.getElementById('cartHandle');

document.addEventListener('DOMContentLoaded', async () => {
    // Bottom Sheet Toggle Logic
    let isCartOpen = false;
    const toggleCart = () => {
        isCartOpen = !isCartOpen;
        if (isCartOpen) {
            cartSheet.classList.remove('translate-y-[calc(100%-70px)]');
            cartSheet.classList.add('translate-y-0');
        } else {
            cartSheet.classList.remove('translate-y-0');
            cartSheet.classList.add('translate-y-[calc(100%-70px)]');
        }
    };

    cartHeaderToggle.addEventListener('click', toggleCart);
    cartHandle.addEventListener('click', toggleCart);
    completeBillBtn.addEventListener('click', completeTransaction);
    downloadPdfBtn.addEventListener('click', downloadCurrentPdf);

    await Promise.all([loadProducts(), loadFamilies()]);
    renderCart(); // init empty state
});

async function loadFamilies() {
    try {
        families = await fetchAPI('/families/');
        familySelect.innerHTML = '<option value="">Select a family...</option>';
        families.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.id;
            opt.textContent = `${f.family_name} (${f.head_name})`;
            familySelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Failed to load families", e);
        familySelect.innerHTML = '<option value="">Error loading families</option>';
    }
}

async function loadProducts() {
    try {
        products = await fetchAPI('/products/');
        renderProducts();
    } catch (e) {
        productGrid.innerHTML = '<div class="col-span-full text-center py-10 text-red-500">Failed to load products.</div>';
    }
}

function renderProducts() {
    productGrid.innerHTML = '';

    const icons = ['cookie', 'light_mode', 'menu_book', 'wine_bar', 'cleaning_services', 'inventory_2'];
    const colors = ['bg-green-50 text-green-700', 'bg-emerald-50 text-emerald-700', 'bg-teal-50 text-teal-700', 'bg-lime-50 text-lime-700', 'bg-green-100 text-green-800', 'bg-slate-50 text-slate-600'];

    products.forEach(p => {
        if (p.stock_quantity <= 0) return;

        const iconIndex = p.id % icons.length;

        const html = `
        <div onclick="addToCart(${p.id})" class="bg-white rounded-xl p-3 shadow-sm flex flex-col gap-2 group cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all select-none border border-border-green">
            <div class="aspect-square w-full rounded-lg ${colors[iconIndex]} flex items-center justify-center overflow-hidden relative border border-white">
                <span class="material-symbols-outlined text-4xl opacity-40">${icons[iconIndex]}</span>
                <button class="absolute bottom-2 right-2 h-8 w-8 bg-primary rounded-full flex items-center justify-center text-white shadow-md active:scale-95 transition-transform">
                    <span class="material-symbols-outlined text-[18px]">add</span>
                </button>
            </div>
            <div>
                <h3 class="font-bold text-sm leading-tight text-slate-800 truncate">${p.name}</h3>
                <p class="text-xs text-slate-500 mt-1">${formatCurrency(p.price)} <span class="text-[10px] opacity-70">/${p.unit}</span></p>
                <p class="text-[10px] text-slate-400 mt-0.5">${p.stock_quantity} in stock</p>
            </div>
        </div>
        `;
        productGrid.insertAdjacentHTML('beforeend', html);
    });
}


function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    const existingItem = cart.find(item => item.product.id === productId);

    if (existingItem) {
        if (existingItem.quantity + 1 > product.stock_quantity) {
            alert(`Only ${product.stock_quantity} ${product.unit} available in stock.`);
            return;
        }
        existingItem.quantity += 1;
    } else {
        cart.push({ product: product, quantity: 1 });
    }

    renderCart();
}

function updateQuantity(productId, delta) {
    const itemIndex = cart.findIndex(item => item.product.id === productId);
    if (itemIndex > -1) {
        const item = cart[itemIndex];
        const newQuantity = item.quantity + delta;

        if (newQuantity <= 0) {
            cart.splice(itemIndex, 1);
        } else if (newQuantity > item.product.stock_quantity) {
            alert(`Only ${item.product.stock_quantity} available.`);
        } else {
            item.quantity = newQuantity;
        }
        renderCart();
    }
}

function renderCart() {
    cartItemsList.innerHTML = '';
    let total = 0;

    if (cart.length === 0) {
        cartItemsList.innerHTML = '<div class="text-center text-slate-500 text-sm py-4">Cart is empty</div>';
        completeBillBtn.disabled = true;
    } else {
        completeBillBtn.disabled = false;

        cart.forEach(item => {
            const itemTotal = item.product.price * item.quantity;
            total += itemTotal;

            const icons = ['cookie', 'light_mode', 'menu_book', 'wine_bar', 'cleaning_services', 'inventory_2'];
            const colors = ['bg-green-50 text-green-700', 'bg-emerald-50 text-emerald-700', 'bg-teal-50 text-teal-700', 'bg-lime-50 text-lime-700', 'bg-green-100 text-green-800', 'bg-slate-50 text-slate-600'];
            const iconIndex = item.product.id % icons.length;

            const html = `
            <div class="flex items-center gap-3">
                <div class="h-10 w-10 rounded-lg ${colors[iconIndex]} flex items-center justify-center shrink-0 border border-white">
                    <span class="material-symbols-outlined text-[20px]">${icons[iconIndex]}</span>
                </div>
                <div class="flex-1 min-w-0">
                    <div class="flex justify-between items-baseline">
                        <h4 class="text-sm font-medium text-slate-800 truncate">${item.product.name}</h4>
                        <span class="text-sm font-bold text-primary">${formatCurrency(itemTotal)}</span>
                    </div>
                    <div class="flex justify-between items-center mt-1">
                        <span class="text-xs text-slate-400">${formatCurrency(item.product.price)}/${item.product.unit}</span>
                        <div class="flex items-center gap-2 bg-slate-100 rounded-md px-1.5 py-0.5">
                            <button onclick="updateQuantity(${item.product.id}, -1)" class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-[16px]">remove</span></button>
                            <span class="text-xs font-mono text-slate-800 w-8 text-center">${item.quantity}</span>
                            <button onclick="updateQuantity(${item.product.id}, 1)" class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined text-[16px]">add</span></button>
                        </div>
                    </div>
                </div>
            </div>
            `;
            cartItemsList.insertAdjacentHTML('beforeend', html);
        });
    }

    cartTotal.textContent = formatCurrency(total);
    cartCount.textContent = `${cart.length} Request${cart.length !== 1 ? 's' : ''}`;
}

let lastInvoiceId = null;

async function completeTransaction() {
    const familyId = familySelect.value;

    if (!familyId) {
        alert("Please select a family for the invoice.");
        // Expand cart to show family select if hidden (on mobile)
        cartSheet.classList.remove('translate-y-0');
        cartSheet.classList.add('translate-y-[calc(100%-70px)]');
        return;
    }

    if (cart.length === 0) return;

    // Build Payload
    const itemsPayload = cart.map(item => ({
        product: item.product.id,
        quantity: item.quantity
    }));

    const payload = {
        family: familyId,
        payment_method: "CASH",
        items: itemsPayload
    };

    try {
        completeBillBtn.disabled = true;
        completeBillBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Processing...';

        const response = await fetchAPI('/invoices/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        lastInvoiceId = response.id;

        // Fetch Whatsapp Link
        const waRes = await fetchAPI(`/invoices/${lastInvoiceId}/get_whatsapp_link/`);
        whatsappLink.href = waRes.whatsapp_url;

        // Show Success Modal
        document.getElementById('successInvoiceText').textContent = `Transaction #${response.id} has been recorded successfully.`;
        successModal.classList.remove('hidden');

        // Refresh products stock locally
        await loadProducts();

    } catch (e) {
        alert("Failed to process transaction. Please try again.");
    } finally {
        completeBillBtn.disabled = false;
        completeBillBtn.innerHTML = '<span class="material-symbols-outlined">receipt_long</span> Complete Bill';
    }
}

async function downloadCurrentPdf() {
    if (!lastInvoiceId) return;

    try {
        downloadPdfBtn.innerHTML = '<span class="material-symbols-outlined animate-spin">sync</span> Downloading...';
        downloadPdfBtn.disabled = true;

        const blob = await fetchAPI(`/invoices/${lastInvoiceId}/generate_pdf/`, { isDownload: true });

        // Create link and trigger download
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Invoice_${lastInvoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();

        // Cleanup
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (e) {
        alert("Failed to download PDF.");
    } finally {
        downloadPdfBtn.innerHTML = '<span class="material-symbols-outlined text-[20px]">download</span> Download PDF';
        downloadPdfBtn.disabled = false;
    }
}

function closeSuccessModal() {
    successModal.classList.add('hidden');
    startNewTransaction(); // Reset cart behind the scenes
}

window.startNewTransaction = function () {
    cart = [];
    familySelect.value = '';
    lastInvoiceId = null;
    renderCart();
    successModal.classList.add('hidden');

    // Minimize cart sheet
    cartSheet.classList.remove('translate-y-0');
    cartSheet.classList.add('translate-y-[calc(100%-70px)]');
}
