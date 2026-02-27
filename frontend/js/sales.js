// State
let allInvoices = [];
let activeFilter = 'ALL'; // 'ALL' | 'CASH' | 'UPI'

// DOM
const searchInput = document.getElementById('searchInput');
const invoiceListContainer = document.getElementById('invoiceListContainer');
const summaryCount = document.getElementById('summaryCount');
const summaryTotal = document.getElementById('summaryTotal');

const filterAll = document.getElementById('filterAll');
const filterCash = document.getElementById('filterCash');
const filterUpi = document.getElementById('filterUpi');

// Filter chip class constants
const CHIP_ACTIVE = 'flex-1 py-2 rounded-xl text-sm font-bold transition-all bg-primary text-white shadow-sm';
const CHIP_INACTIVE = 'flex-1 py-2 rounded-xl text-sm font-bold transition-all text-slate-500 bg-slate-100';

document.addEventListener('DOMContentLoaded', async () => {
    // Filter chip toggle
    filterAll.addEventListener('click', () => setFilter('ALL'));
    filterCash.addEventListener('click', () => setFilter('CASH'));
    filterUpi.addEventListener('click', () => setFilter('UPI'));

    // Search (debounced)
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => renderFiltered(), 250);
    });

    await loadInvoices();
});

function setFilter(method) {
    activeFilter = method;

    filterAll.className = method === 'ALL' ? CHIP_ACTIVE : CHIP_INACTIVE;
    filterCash.className = method === 'CASH' ? CHIP_ACTIVE : CHIP_INACTIVE;
    filterUpi.className = method === 'UPI' ? CHIP_ACTIVE : CHIP_INACTIVE;

    // Restore icons inside cash/upi chips after className wipe
    filterCash.innerHTML = '<span class="material-symbols-outlined text-[14px] align-middle">currency_rupee</span> Cash';
    filterUpi.innerHTML = '<span class="material-symbols-outlined text-[14px] align-middle">qr_code_scanner</span> UPI';

    renderFiltered();
}

async function loadInvoices(searchQuery = '') {
    try {
        let url = '/invoices/';
        if (searchQuery) url += `?search=${encodeURIComponent(searchQuery)}`;
        // PAGE_SIZE is 100 by default; fetch up to 500 for a history page
        allInvoices = await fetchAPI(`${url}${searchQuery ? '&' : '?'}page_size=500`);
        renderFiltered();
    } catch (e) {
        invoiceListContainer.innerHTML = `
            <div class="text-center py-16 text-red-400">
                <span class="material-symbols-outlined text-5xl mb-2 block">error</span>
                Failed to load transactions.
            </div>`;
    }
}

function renderFiltered() {
    const query = searchInput.value.trim().toLowerCase();

    let filtered = allInvoices;

    // Client-side payment filter
    if (activeFilter !== 'ALL') {
        filtered = filtered.filter(inv => inv.payment_method === activeFilter);
    }

    // Client-side text search (family name, head name, ward)
    if (query) {
        filtered = filtered.filter(inv =>
            inv.family_name?.toLowerCase().includes(query) ||
            inv.head_name?.toLowerCase().includes(query) ||
            inv.ward_name?.toLowerCase().includes(query) ||
            String(inv.id).includes(query)
        );
    }

    // Update summary strip
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
            <div class="text-center py-16 text-slate-400">
                <span class="material-symbols-outlined text-5xl mb-2 block">receipt_long</span>
                <p class="font-medium">No transactions found</p>
                <p class="text-sm mt-1">Try adjusting your search or filter</p>
            </div>`;
        return;
    }

    const grouped = groupByDate(invoices);
    const avatarColors = [
        'from-emerald-400 to-teal-500',
        'from-blue-400 to-indigo-500',
        'from-orange-400 to-red-500',
        'from-purple-400 to-pink-500',
        'from-amber-400 to-orange-500',
        'from-cyan-400 to-blue-500',
    ];

    let html = '';

    Object.entries(grouped).forEach(([dateLabel, dayInvoices]) => {
        const dayTotal = dayInvoices.reduce((s, i) => s + parseFloat(i.total_amount || 0), 0);

        html += `
        <div class="mb-6">
            <!-- Date Header -->
            <div class="flex items-center justify-between mb-3">
                <div class="flex items-center gap-2">
                    <span class="material-symbols-outlined text-[16px] text-slate-400">calendar_today</span>
                    <h3 class="text-xs font-bold text-slate-500 uppercase tracking-wider">${dateLabel}</h3>
                </div>
                <span class="text-xs font-bold text-primary-dark">${formatCurrency(dayTotal)}</span>
            </div>

            <!-- Invoice Cards -->
            <div class="space-y-3">
        `;

        dayInvoices.forEach(inv => {
            const initial = inv.family_name ? inv.family_name.charAt(0).toUpperCase() : '?';
            const colorClass = avatarColors[inv.id % avatarColors.length];
            const isUpi = inv.payment_method === 'UPI';

            const payBadge = isUpi
                ? `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                       <span class="material-symbols-outlined text-[11px]">qr_code_scanner</span> UPI
                   </span>`
                : `<span class="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                       <span class="material-symbols-outlined text-[11px]">currency_rupee</span> Cash
                   </span>`;

            html += `
            <div class="bg-white rounded-2xl p-4 border border-border-green shadow-[0_2px_8px_-2px_rgba(22,163,74,0.08)] flex items-center gap-3">
                <!-- Avatar -->
                <div class="w-11 h-11 rounded-full bg-gradient-to-br ${colorClass} flex items-center justify-center text-white font-extrabold text-lg shrink-0 shadow">
                    ${initial}
                </div>

                <!-- Info -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-center gap-2 mb-0.5">
                        <p class="font-bold text-slate-900 text-sm truncate">The ${inv.family_name} Family</p>
                        ${payBadge}
                    </div>
                    <p class="text-xs text-slate-500 truncate">
                        ${inv.head_name} &nbsp;·&nbsp; ${inv.ward_name}
                    </p>
                    <p class="text-xs text-slate-400 mt-0.5">${inv.item_count} item${inv.item_count !== 1 ? 's' : ''} &nbsp;·&nbsp; #${inv.id}</p>
                </div>

                <!-- Amount + Actions -->
                <div class="flex flex-col items-end gap-2 shrink-0">
                    <span class="text-base font-extrabold text-slate-900">${formatCurrency(inv.total_amount)}</span>
                    <div class="flex gap-1.5">
                        <button onclick="shareWhatsApp(${inv.id})"
                            class="w-8 h-8 rounded-full bg-[#dcfce7] hover:bg-[#25D366] hover:text-white text-primary transition-colors flex items-center justify-center"
                            title="Share via WhatsApp">
                            <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
                            </svg>
                        </button>
                        <button onclick="downloadPdf(${inv.id})"
                            class="w-8 h-8 rounded-full bg-slate-100 hover:bg-primary hover:text-white text-slate-500 transition-colors flex items-center justify-center"
                            title="Download PDF">
                            <span class="material-symbols-outlined text-[16px]">download</span>
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
