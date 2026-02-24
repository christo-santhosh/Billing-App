document.addEventListener('DOMContentLoaded', async () => {
    // Mobile Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    function toggleSidebar() {
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

    // Load Dashboard Data
    try {
        const [wardAnalysis, wardsResponse] = await Promise.all([
            fetchAPI('/analytics/ward_wise_analysis/'),
            fetchAPI('/wards/')
        ]);

        document.getElementById('loadingIndicator').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        document.getElementById('dashboardContent').classList.add('flex');

        // Populate Top Ward
        if (wardAnalysis.ward_with_most_purchases) {
            document.getElementById('statTopWard').textContent = wardAnalysis.ward_with_most_purchases.ward_name;
        } else {
            document.getElementById('statTopWard').textContent = "No data yet";
        }

        // Total Wards
        document.getElementById('statTotalWards').textContent = Array.isArray(wardsResponse) ? wardsResponse.length : wardsResponse.count || 0;

        // Calculate Total Revenue and Render List
        let totalRevenueAllTime = 0;
        const bdList = document.getElementById('wardBreakdownList');
        bdList.innerHTML = '';

        const colors = ['bg-primary', 'bg-purple-500', 'bg-emerald-500', 'bg-orange-500', 'bg-pink-500', 'bg-blue-500'];

        wardAnalysis.ward_revenue.forEach((ward, index) => {
            const revenue = parseFloat(ward.total_revenue || 0);
            totalRevenueAllTime += revenue;

            const colorClass = colors[index % colors.length];
            const itemHTML = `
                <div class="flex items-center justify-between p-3 rounded-lg bg-background-dark border border-slate-800 hover:bg-slate-800/50 transition-colors">
                    <div class="flex items-center gap-3">
                        <span class="w-3 h-3 rounded-full ${colorClass} ring-2 ring-white/10"></span>
                        <span class="text-sm font-medium text-slate-200">${ward.ward_name}</span>
                    </div>
                    <div class="text-right">
                        <span class="block text-sm font-bold text-white">${formatCurrency(revenue)}</span>
                        <span class="text-xs text-slate-500">${ward.purchase_count} Orders</span>
                    </div>
                </div>
            `;
            bdList.insertAdjacentHTML('beforeend', itemHTML);
        });

        document.getElementById('statTotalRevenue').textContent = formatCurrency(totalRevenueAllTime);

    } catch (error) {
        console.error("Dashboard failed to load:", error);
        document.getElementById('loadingIndicator').textContent = "Failed to load dashboard data. Check backend connection.";
        document.getElementById('loadingIndicator').className = "text-center py-10 text-red-500";
    }
});
