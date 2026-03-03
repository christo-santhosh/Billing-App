// State
let allInvoices = [];
let activeFilter = 'ALL'; // 'ALL' | 'CASH' | 'UPI'

// DOM
const searchInput = document.getElementById('searchInput');
const invoiceListContainer = document.getElementById('invoiceListContainer');
const summaryCount = document.getElementById('summaryCount');
const summaryTotal = document.getElementById('summaryTotal');

let wardSelectInstance = null;
let familySelectInstance = null;

document.addEventListener('DOMContentLoaded', async () => {
    // Search (debounced) - now filters locally after fetching
    let searchTimeout;
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => renderFiltered(), 250);
        });
    }

    // Listen for filter changes on standard inputs
    document.getElementById('start_date').addEventListener('change', loadInvoices);
    document.getElementById('end_date').addEventListener('change', loadInvoices);
    document.getElementById('payment_method').addEventListener('change', loadInvoices);

    await loadDropdowns();
    await loadInvoices();
});

function resetFilters() {
    document.getElementById('filterForm').reset();

    if (wardSelectInstance) {
        wardSelectInstance.setValue('', true); // silent
    }
    if (familySelectInstance) {
        familySelectInstance.setValue('', true); // silent
    }

    loadInvoices();
}

async function loadDropdowns() {
    try {
        const [wardRes, familyRes] = await Promise.all([
            fetchAPI('/wards/'),
            fetchAPI('/families/')
        ]);

        if (wardSelectInstance) wardSelectInstance.destroy();
        if (familySelectInstance) familySelectInstance.destroy();

        wardSelectInstance = new TomSelect('#ward_id', {
            create: false,
            allowEmptyOption: true,
            placeholder: "All Wards",
            options: wardRes.map(w => ({ value: w.id, text: `${w.ward_name} (${w.ward_number})` })),
            searchField: ['text'],
            maxOptions: 500,
        });

        familySelectInstance = new TomSelect('#family_id', {
            create: false,
            allowEmptyOption: true,
            placeholder: "All Families",
            options: familyRes.map(f => ({ value: f.id, text: f.family_name })),
            searchField: ['text'],
            maxOptions: 1000,
        });

        wardSelectInstance.on('change', loadInvoices);
        familySelectInstance.on('change', loadInvoices);

    } catch (error) {
        console.error("Failed to load filter dropdowns", error);
    }
}

function getFilterParams() {
    const params = new URLSearchParams();
    const start = document.getElementById('start_date').value;
    const end = document.getElementById('end_date').value;
    const wardId = document.getElementById('ward_id').value;
    const familyId = document.getElementById('family_id').value;
    const payment = document.getElementById('payment_method').value;

    if (start) params.append('start_date', start);
    if (end) params.append('end_date', end);
    if (wardId) params.append('ward_id', wardId);
    if (familyId) params.append('family_id', familyId);
    if (payment) params.append('payment_method', payment);

    return params.toString();
}

async function loadInvoices() {
    try {
        invoiceListContainer.innerHTML = '<div class="text-center text-muted" style="padding:64px 0;"><span class="material-symbols-outlined spin text-5xl mb-sm" style="display:block;">sync</span>Loading transactions...</div>';

        const query = getFilterParams();
        let url = '/invoices/';

        // Use page_size=500 for a large enough local list to group/search easily frontend
        let qs = `page_size=500`;
        if (query) qs += `&${query}`;

        allInvoices = await fetchAPI(`${url}?${qs}`);

        renderFiltered();
    } catch (e) {
        invoiceListContainer.innerHTML = `
            <div class="text-center text-red" style="padding:64px 0;">
                <span class="material-symbols-outlined text-5xl mb-sm" style="display:block;">error</span>
                Failed to load transactions.
            </div>`;
    }
}

function renderFiltered() {
    const query = searchInput ? searchInput.value.trim().toLowerCase() : '';

    let filtered = allInvoices;

    // Local search functionality (since backend query handles ward/family/date/payment)
    if (query) {
        filtered = filtered.filter(inv =>
            inv.family_name?.toLowerCase().includes(query) ||
            inv.head_name?.toLowerCase().includes(query) ||
            inv.ward_name?.toLowerCase().includes(query) ||
            String(inv.id).includes(query)
        );
    }

    const total = filtered.reduce((sum, inv) => sum + parseFloat(inv.total_amount || 0), 0);
    summaryCount.textContent = `${filtered.length} transaction${filtered.length !== 1 ? 's' : ''}`;
    summaryTotal.textContent = formatCurrency(total);

    renderGrouped(filtered);
}

function groupByDate(invoices) {
    const groups = {};
    invoices.forEach(inv => {
        const dateKey = new Date(inv.date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'long', year: 'numeric'
        });
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(inv);
    });
    return groups;
}

function renderGrouped(invoices) {
    if (invoices.length === 0) {
        invoiceListContainer.innerHTML = `
            <div class="text-center text-muted" style="padding:64px 0;">
                <span class="material-symbols-outlined text-5xl mb-sm" style="display:block;">receipt_long</span>
                <p class="medium">No transactions found</p>
                <p class="text-sm mt-sm">Try adjusting your search or filter</p>
            </div>`;
        return;
    }

    const grouped = groupByDate(invoices);
    const avatarColors = ['avatar-green', 'avatar-blue', 'avatar-orange', 'avatar-purple', 'avatar-amber', 'avatar-cyan'];

    let html = '';

    Object.entries(grouped).forEach(([dateLabel, dayInvoices]) => {
        const dayTotal = dayInvoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

        html += `
        <div class="mb-lg">
            <!-- Date Header -->
            <div class="date-header">
                <div class="date-label">
                    <span class="material-symbols-outlined">calendar_today</span>
                    <h3>${dateLabel}</h3>
                </div>
                <span class="text-xs bold text-primary-dark">${formatCurrency(dayTotal)}</span>
            </div>

            <!-- Invoice Cards -->
            <div class="space-y-sm">
        `;

        dayInvoices.forEach(inv => {
            const initial = inv.family_name ? inv.family_name.charAt(0).toUpperCase() : '?';
            const colorClass = avatarColors[inv.id % avatarColors.length];
            const isUpi = inv.payment_method === 'UPI';

            const payBadge = isUpi
                ? `<span class="badge badge-upi">
                       <span class="material-symbols-outlined" style="font-size:11px;">qr_code_scanner</span> UPI
                   </span>`
                : `<span class="badge badge-cash">
                       <span class="material-symbols-outlined" style="font-size:11px;">currency_rupee</span> Cash
                   </span>`;

            html += `
            <div class="invoice-card" onclick="viewInvoiceDetails(${inv.id})" style="cursor: pointer;">
                <!-- Avatar -->
                <div class="avatar-lg ${colorClass}">
                    ${initial}
                </div>

                <!-- Info -->
                <div class="flex-1" style="min-width:0;">
                    <div class="flex-row gap-sm mb-sm">
                        <p class="bold text-dark text-sm truncate">${inv.family_name}</p>
                        ${payBadge}
                    </div>
                    <p class="text-xs text-light truncate">
                        ${inv.head_name} &nbsp;·&nbsp; ${inv.ward_name}
                    </p>
                    <p class="text-xs text-muted mt-sm">${inv.item_count} item${inv.item_count !== 1 ? 's' : ''} &nbsp;·&nbsp; #${inv.id}</p>
                </div>

                <!-- Amount + Actions -->
                <div class="flex-col shrink-0" style="align-items:flex-end; gap:8px;">
                    <span class="extra-bold text-dark">${formatCurrency(inv.total_amount)}</span>
                    <div class="flex-row gap-xs">
                        <button onclick="event.stopPropagation(); shareWhatsApp(${inv.id})" class="action-wa" title="Share via WhatsApp">
                            <svg style="width:16px;height:16px;fill:currentColor;" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                        </button>
                        <button onclick="event.stopPropagation(); downloadPdf(${inv.id})" class="action-pdf" title="Download PDF">
                            <span class="material-symbols-outlined" style="font-size:16px;">download</span>
                        </button>
                    </div>
                </div>
            </div>
            `;
        });

        html += `</div></div>`;
    });

    invoiceListContainer.innerHTML = html;
}

async function shareWhatsApp(invoiceId) {
    try {
        const res = await fetchAPI(`/invoices/${invoiceId}/get_whatsapp_link/`);
        window.open(res.whatsapp_url, '_blank');
    } catch (e) {
        alert('Could not generate WhatsApp link.');
    }
}

async function downloadPdf(invoiceId) {
    try {
        const blob = await fetchAPI(`/invoices/${invoiceId}/generate_pdf/`, { isDownload: true });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `Invoice_${invoiceId}.pdf`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
    } catch (e) {
        alert('Failed to download PDF.');
    }
}

// --- Modal Logic ---

const invoiceModal = document.getElementById('invoiceModal');

function closeModal() {
    if (invoiceModal) invoiceModal.classList.remove('show');
}

// Close modal when clicking outside
if (invoiceModal) {
    invoiceModal.addEventListener('click', (e) => {
        if (e.target === invoiceModal) closeModal();
    });
}

async function viewInvoiceDetails(id) {
    const inv = allInvoices.find(i => i.id === id);
    if (!inv) return;

    // Set basic info
    document.getElementById('modalInvoiceId').textContent = `#${inv.id}`;
    document.getElementById('modalFamilyName').textContent = inv.family_name || 'Unknown';
    document.getElementById('modalFamilyDetails').textContent = `${inv.head_name || 'N/A'} · ${inv.ward_name || 'Unknown Ward'}`;

    // Avatar
    const initial = inv.family_name ? inv.family_name.charAt(0).toUpperCase() : '?';
    const avatarColors = ['avatar-green', 'avatar-blue', 'avatar-orange', 'avatar-purple', 'avatar-amber', 'avatar-cyan'];
    const colorClass = avatarColors[inv.id % avatarColors.length];
    const modalAvatar = document.getElementById('modalAvatar');
    modalAvatar.textContent = initial;
    modalAvatar.className = `avatar-lg ${colorClass}`;

    // Date & Payment
    const dateObj = new Date(inv.date);
    const dateStr = dateObj.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + dateObj.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    const payBadge = inv.payment_method === 'UPI' ? '📱 UPI' : '💵 Cash';
    document.getElementById('modalPaymentInfo').textContent = `${dateStr} | ${payBadge}`;

    document.getElementById('modalTotalAmount').textContent = formatCurrency(inv.total_amount);

    // Set button actions
    document.getElementById('modalDownloadBtn').onclick = () => downloadPdf(inv.id);
    document.getElementById('modalWhatsAppBtn').onclick = () => shareWhatsApp(inv.id);

    const itemsList = document.getElementById('modalItemsList');
    itemsList.innerHTML = '<div class="text-center text-muted p-sm"><span class="material-symbols-outlined spin" style="vertical-align:middle; margin-right:8px;">sync</span>Loading items...</div>';

    invoiceModal.classList.add('show');

    try {
        const fullInv = await fetchAPI(`/invoices/${id}/`);
        renderModalItems(fullInv.items);
    } catch (e) {
        itemsList.innerHTML = '<div class="text-center text-red p-sm">Failed to load invoice items.</div>';
    }
}

function renderModalItems(items) {
    const list = document.getElementById('modalItemsList');
    if (!items || items.length === 0) {
        list.innerHTML = '<div class="text-center text-muted p-sm">No items found.</div>';
        return;
    }

    let html = '';
    items.forEach(item => {
        const total = item.quantity * item.price;
        html += `
        <div class="flex-between" style="padding: 8px 0; border-bottom: 1px solid var(--border-light);">
            <div style="flex:1; padding-right: 16px;">
                <p class="text-sm bold text-dark">${item.product_name || 'Product'} <span class="text-xs text-muted font-normal ml-sm">${formatCurrency(item.price)}/${item.unit || 'unit'}</span></p>
                <p class="text-sm text-light mt-xs">Qty: ${Number(item.quantity)}</p>
            </div>
            <div class="text-sm bold" style="color:var(--text-dark);">
                ${formatCurrency(total)}
            </div>
        </div>
        `;
    });
    list.innerHTML = html;
}

