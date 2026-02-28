document.addEventListener('DOMContentLoaded', async () => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';
    document.getElementById('greetingTime').textContent = greeting;

    // Load Dashboard Data
    try {
        const wardAnalysis = await fetchAPI('/analytics/ward_wise_analysis/');

        // ── Stat Cards ─────────────────────────────────────────────
        const wardData = wardAnalysis.ward_revenue || [];

        // Card 1: Total Revenue (All Time) — sum of all ward revenues
        const totalRevenue = wardData.reduce((sum, w) => sum + parseFloat(w.total_revenue || 0), 0);
        document.getElementById('statRevenue').textContent = formatCurrency(totalRevenue);

        // Card 2: Top Performing Ward — ward with highest revenue
        if (wardData.length > 0) {
            const topWard = wardData.reduce((best, w) =>
                parseFloat(w.total_revenue || 0) > parseFloat(best.total_revenue || 0) ? w : best
                , wardData[0]);
            document.getElementById('statTopWard').textContent = topWard.ward_name;
        }

        // Card 3: Total Wards
        document.getElementById('statTotalWards').textContent = wardData.length;

        // ── Recent Activity ─────────────────────────────────────────
        const recentInvoices = await fetchAPI('/invoices/?ordering=-date&limit=5');
        const recentBody = document.getElementById('recentTransactionsBody');

        // Handle paginated or direct array response
        const invoicesList = recentInvoices.results || recentInvoices;

        if (invoicesList && invoicesList.length > 0) {
            recentBody.innerHTML = invoicesList.slice(0, 5).map(inv => `
                <tr style="border-bottom: 1px solid var(--border-light);">
                    <td class="p-sm text-sm text-dark">${formatDate(inv.date)}</td>
                    <td class="p-sm">
                        <p class="text-sm bold text-dark m-0">${inv.family_name}</p>
                        <p class="text-xs text-muted m-0">${inv.head_name}</p>
                    </td>
                    <td class="p-sm text-sm bold text-dark" style="text-align:right;">${formatCurrency(inv.total_amount)}</td>
                    <td class="p-sm" style="text-align:right;">
                        <span class="badge ${inv.payment_method === 'CASH' ? 'bg-green text-green' : 'bg-blue text-blue'}">
                            ${inv.payment_method}
                        </span>
                    </td>
                </tr>
            `).join('');
        } else {
            recentBody.innerHTML = `<tr><td colspan="4" class="text-center text-muted" style="padding: 24px;">No recent transactions found.</td></tr>`;
        }

    } catch (error) {
        console.error("Dashboard failed to load:", error);
    }
});
