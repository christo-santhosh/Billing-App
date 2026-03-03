// State
let products = [];
let cart = [];
let families = [];
let wards = [];

// DOM Elements
const productGrid = document.getElementById('productGrid');
const cartItemsList = document.getElementById('cartItemsList');
const cartTotal = document.getElementById('cartTotal');
const cartCount = document.getElementById('cartCount');
const completeBillBtn = document.getElementById('completeBillBtn');
const selectedFamilyId = document.getElementById('selectedFamilyId');
const familySearchInput = document.getElementById('familySearchInput');
const familySearchResults = document.getElementById('familySearchResults');
const familySearchList = document.getElementById('familySearchList');
const familySearchState = document.getElementById('familySearchState');
const familySelectedState = document.getElementById('familySelectedState');
const selectedFamilyName = document.getElementById('selectedFamilyName');
const clearFamilyBtn = document.getElementById('clearFamilyBtn');
const familyModal = document.getElementById('familyModal');
const modalWardSelect = document.getElementById('modalWardSelect');
const successModal = document.getElementById('successModal');
const whatsappLink = document.getElementById('whatsappLink');
const downloadPdfBtn = document.getElementById('downloadPdfBtn');
const cartSheet = document.getElementById('cartSheet');
const cartHeaderToggle = document.getElementById('cartHeaderToggle');
const cartHandle = document.getElementById('cartHandle');
const payMethodCash = document.getElementById('payMethodCash');
const payMethodUpi = document.getElementById('payMethodUpi');

document.addEventListener('DOMContentLoaded', async () => {
    // Bottom Sheet Toggle Logic
    let isCartOpen = false;
    const toggleCart = () => {
        isCartOpen = !isCartOpen;
        if (isCartOpen) {
            cartSheet.classList.add('open');
        } else {
            cartSheet.classList.remove('open');
        }
    };

    cartHeaderToggle.addEventListener('click', toggleCart);
    cartHandle.addEventListener('click', toggleCart);
    completeBillBtn.addEventListener('click', completeTransaction);
    downloadPdfBtn.addEventListener('click', downloadCurrentPdf);
    if (clearFamilyBtn) clearFamilyBtn.addEventListener('click', clearFamilySelection);

    // Payment method toggle
    function setPaymentMethod(method) {
        if (method === 'CASH') {
            payMethodCash.classList.add('active');
            payMethodUpi.classList.remove('active');
        } else {
            payMethodUpi.classList.add('active');
            payMethodCash.classList.remove('active');
        }
        payMethodCash.dataset.active = method === 'CASH' ? 'true' : 'false';
    }

    payMethodCash.addEventListener('click', () => setPaymentMethod('CASH'));
    payMethodUpi.addEventListener('click', () => setPaymentMethod('UPI'));

    await Promise.all([loadProducts(), loadWards()]);
    renderCart(); // init empty state

    // Setup Search debounce
    let searchTimeout;
    if (familySearchInput) {
        familySearchInput.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            clearTimeout(searchTimeout);

            if (query.length < 2) {
                familySearchResults.classList.add('hidden');
                return;
            }

            searchTimeout = setTimeout(() => {
                fetchFamilyResults(query);
            }, 300);
        });

        // Hide search when clicking outside
        document.addEventListener('click', (e) => {
            if (!familySearchState.contains(e.target)) {
                familySearchResults.classList.add('hidden');
            }
        });
    }
});

async function loadWards() {
    try {
        wards = await fetchAPI('/wards/');
        modalWardSelect.innerHTML = '<option value="">Select a Ward...</option>';
        wards.forEach(w => {
            modalWardSelect.insertAdjacentHTML('beforeend', `<option value="${w.id}">${w.ward_name} (${w.ward_number})</option>`);
        });
    } catch (e) {
        console.error("Failed to load wards for modal", e);
        modalWardSelect.innerHTML = '<option value="">Error loading wards</option>';
    }
}

async function fetchFamilyResults(query) {
    try {
        const results = await fetchAPI(`/families/?search=${encodeURIComponent(query)}`);
        renderSearchResults(results);
    } catch (e) {
        console.error("Search failed", e);
    }
}

function renderSearchResults(results) {
    familySearchList.innerHTML = '';

    if (results.length === 0) {
        familySearchList.innerHTML = '<li class="text-center text-sm text-light" style="padding:16px;">No families found.</li>';
    } else {
        results.forEach(f => {
            const li = document.createElement('li');
            li.className = "search-item";
            li.innerHTML = `
                <div class="avatar-sm" style="background:var(--green-100); color:var(--primary-dark);">
                    ${f.family_name.charAt(0).toUpperCase()}
                </div>
                <div class="flex-1" style="min-width:0;">
                    <p class="text-sm bold text-dark truncate">${f.family_name}</p>
                    <p class="text-xs text-light truncate">Head: ${f.head_name} | ${f.phone_number}</p>
                </div>
            `;
            li.addEventListener('click', () => selectFamily(f));
            familySearchList.appendChild(li);
        });
    }

    familySearchResults.classList.remove('hidden');
}

function selectFamily(family) {
    selectedFamilyId.value = family.id;
    selectedFamilyName.textContent = `${family.family_name} (${family.head_name})`;

    familySearchState.classList.add('hidden');
    familySearchResults.classList.add('hidden');
    familySelectedState.classList.remove('hidden');
    familySelectedState.style.display = 'flex';
}

function clearFamilySelection() {
    selectedFamilyId.value = '';
    familySearchInput.value = '';

    familySelectedState.classList.add('hidden');
    familySelectedState.style.display = '';
    familySearchState.classList.remove('hidden');
    familySearchInput.focus();
}

function openFamilyModal() {
    familyModal.classList.add('show');
}

function closeFamilyModal() {
    familyModal.classList.remove('show');
}

async function saveFamily(e) {
    e.preventDefault();
    const btn = document.getElementById('registerFamilyBtn');

    const payload = {
        family_name: document.getElementById('familyName').value,
        head_name: document.getElementById('headName').value,
        phone_number: document.getElementById('phoneNumber').value,
        ward: document.getElementById('modalWardSelect').value
    };

    try {
        btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Registering...';
        btn.disabled = true;

        const newFamily = await fetchAPI('/families/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        // Reset Form
        document.getElementById('familyName').value = '';
        document.getElementById('headName').value = '';
        document.getElementById('phoneNumber').value = '';
        document.getElementById('modalWardSelect').value = '';
        closeFamilyModal();

        // Auto-select the newly registered family for the bill!
        selectFamily(newFamily);

    } catch (err) {
        alert(err.message || "Failed to register family. Please verify details.");
    } finally {
        btn.innerHTML = 'Register Family';
        btn.disabled = false;
    }
}

async function loadProducts() {
    try {
        products = await fetchAPI('/products/');
        renderProducts();
    } catch (e) {
        productGrid.innerHTML = '<div style="grid-column:1/-1;" class="text-center p-md text-red">Failed to load products.</div>';
    }
}

function renderProducts() {
    productGrid.innerHTML = '';

    const icons = ['cookie', 'light_mode', 'menu_book', 'wine_bar', 'cleaning_services', 'inventory_2'];
    const colorClasses = ['icon-green', 'icon-emerald', 'icon-teal', 'icon-lime', 'icon-green-dark', 'icon-slate'];

    products.forEach(p => {
        if (p.stock_quantity <= 0) return;

        const iconIndex = p.id % icons.length;

        const html = `
        <div onclick="addToCart(${p.id})" class="product-card">
            <div class="product-icon-box ${colorClasses[iconIndex]}">
                <span class="material-symbols-outlined">${icons[iconIndex]}</span>
                <button class="product-add-btn">
                    <span class="material-symbols-outlined">add</span>
                </button>
            </div>
            <div>
                <h3 class="product-name truncate">${p.name}</h3>
                <p class="product-price">${formatCurrency(p.price)} <span class="text-xs text-muted">/${p.unit}</span></p>
                <p class="product-stock">${p.stock_quantity} in stock</p>
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
        cartItemsList.innerHTML = '<div class="text-center text-light text-sm" style="padding:16px 0;">Cart is empty</div>';
        completeBillBtn.disabled = true;
    } else {
        completeBillBtn.disabled = false;

        cart.forEach(item => {
            const itemTotal = item.product.price * item.quantity;
            total += itemTotal;

            const icons = ['cookie', 'light_mode', 'menu_book', 'wine_bar', 'cleaning_services', 'inventory_2'];
            const colorClasses = ['icon-green', 'icon-emerald', 'icon-teal', 'icon-lime', 'icon-green-dark', 'icon-slate'];
            const iconIndex = item.product.id % icons.length;

            const html = `
            <div class="cart-item">
                <div class="cart-item-icon ${colorClasses[iconIndex]}">
                    <span class="material-symbols-outlined">${icons[iconIndex]}</span>
                </div>
                <div class="flex-1" style="min-width:0;">
                    <div class="cart-item-row">
                        <h4 class="cart-item-name truncate">${item.product.name}</h4>
                        <span class="cart-item-total">${formatCurrency(itemTotal)}</span>
                    </div>
                    <div class="flex-between mt-sm">
                        <span class="cart-item-price">${formatCurrency(item.product.price)}/${item.product.unit}</span>
                        <div class="qty-control">
                            <button onclick="updateQuantity(${item.product.id}, -1)" class="qty-btn"><span class="material-symbols-outlined">remove</span></button>
                            <span class="qty-value">${item.quantity}</span>
                            <button onclick="updateQuantity(${item.product.id}, 1)" class="qty-btn"><span class="material-symbols-outlined">add</span></button>
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

function getSelectedPaymentMethod() {
    return payMethodCash.dataset.active === 'false' ? 'UPI' : 'CASH';
}

async function completeTransaction() {
    const familyId = selectedFamilyId.value;

    if (!familyId) {
        alert("Please select a family for the invoice.");
        cartSheet.classList.remove('open');
        return;
    }

    if (cart.length === 0) return;

    // Build Payload
    const itemsPayload = cart.map(item => ({
        product: item.product.id,
        quantity: item.quantity
    }));

    const paymentMethod = getSelectedPaymentMethod();
    const payload = {
        family: familyId,
        payment_method: paymentMethod,
        items: itemsPayload
    };

    try {
        completeBillBtn.disabled = true;
        completeBillBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Processing...';

        const response = await fetchAPI('/invoices/', {
            method: 'POST',
            body: JSON.stringify(payload)
        });

        lastInvoiceId = response.id;

        // Fetch Whatsapp Link
        const waRes = await fetchAPI(`/invoices/${lastInvoiceId}/get_whatsapp_link/`);
        whatsappLink.href = waRes.whatsapp_url;

        // Show Success Modal
        const methodLabel = paymentMethod === 'UPI' ? '📲 UPI' : '💵 Cash';
        document.getElementById('successInvoiceText').textContent = `Transaction #${response.id} recorded. Paid by ${methodLabel}.`;
        successModal.classList.add('show');

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
        downloadPdfBtn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Downloading...';
        downloadPdfBtn.disabled = true;

        const blob = await fetchAPI(`/invoices/${lastInvoiceId}/generate_pdf/`, { isDownload: true });

        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `Invoice_${lastInvoiceId}.pdf`;
        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (e) {
        alert("Failed to download PDF.");
    } finally {
        downloadPdfBtn.innerHTML = '<span class="material-symbols-outlined" style="font-size:20px;">download</span> Download PDF';
        downloadPdfBtn.disabled = false;
    }
}

function closeSuccessModal() {
    successModal.classList.remove('show');
    startNewTransaction();
}

window.startNewTransaction = function () {
    cart = [];
    clearFamilySelection();
    lastInvoiceId = null;
    renderCart();
    successModal.classList.remove('show');

    // Minimize cart sheet
    cartSheet.classList.remove('open');
}
