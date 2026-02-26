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
        const [wardAnalysis, wardsResponse, revenueData] = await Promise.all([
            fetchAPI('/analytics/ward_wise_analysis/'),
            fetchAPI('/wards/'),
            fetchAPI('/analytics/time_based_revenue/')
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

        // Calculate Total Revenue and Render Ward List
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
                        <span class="text-sm font-medium text-slate-900">${ward.ward_name}</span>
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

        // ── Revenue Chart ──────────────────────────────────────────────────
        // Prepare datasets from API response
        function prepareChartData(records, dateKey, count = 10) {
            // Sort ascending and take last `count` entries
            const sorted = [...records]
                .filter(r => r[dateKey] && r.revenue)
                .sort((a, b) => new Date(a[dateKey]) - new Date(b[dateKey]))
                .slice(-count);

            const labels = sorted.map(r => {
                const d = new Date(r[dateKey]);
                return d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
            });
            const values = sorted.map(r => parseFloat(r.revenue));
            return { labels, values };
        }

        const datasets = {
            week: prepareChartData(revenueData.weekly, 'week', 10),
            month: prepareChartData(revenueData.monthly, 'month', 12),
            year: prepareChartData(revenueData.annually, 'year', 10),
        };

        // Build Chart.js chart
        const ctx = document.getElementById('revenueChart').getContext('2d');

        function makeGradient() {
            const grad = ctx.createLinearGradient(0, 0, 0, 192);
            grad.addColorStop(0, 'rgba(22,163,74,0.20)');
            grad.addColorStop(1, 'rgba(22,163,74,0)');
            return grad;
        }

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: datasets.month.labels,
                datasets: [{
                    data: datasets.month.values,
                    borderColor: '#16a34a',
                    borderWidth: 2,
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#15803d',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    fill: true,
                    backgroundColor: makeGradient(),
                    tension: 0.4,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: {
                            label: ctx => ' ₹' + ctx.parsed.y.toFixed(2)
                        },
                        backgroundColor: '#fff',
                        titleColor: '#475569',
                        bodyColor: '#16a34a',
                        bodyFont: { weight: 'bold' },
                        borderColor: '#bbf7d0',
                        borderWidth: 1,
                        padding: 10,
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: '#94a3b8', font: { size: 11 } },
                        border: { display: false },
                    },
                    y: {
                        grid: { color: '#f1f5f9', drawBorder: false },
                        ticks: {
                            color: '#94a3b8',
                            font: { size: 11 },
                            callback: v => '₹' + (v >= 1000 ? (v / 1000).toFixed(1) + 'k' : v)
                        },
                        border: { display: false },
                    }
                }
            }
        });

        // Wire up toggle buttons
        const btnWeek = document.getElementById('btnWeek');
        const btnMonth = document.getElementById('btnMonth');
        const btnYear = document.getElementById('btnYear');

        const activeClass = ['bg-white', 'text-primary-dark', 'shadow-sm', 'border', 'border-slate-100'];
        const inactiveClass = ['text-slate-500'];

        function setActiveBtn(active) {
            [btnWeek, btnMonth, btnYear].forEach(btn => {
                btn.classList.remove(...activeClass, ...inactiveClass);
                btn.classList.add(...(btn === active ? activeClass : inactiveClass));
            });
        }

        function switchChart(period) {
            const d = datasets[period];
            chart.data.labels = d.labels;
            chart.data.datasets[0].data = d.values;
            chart.data.datasets[0].backgroundColor = makeGradient();
            chart.update();
            setActiveBtn(period === 'week' ? btnWeek : period === 'month' ? btnMonth : btnYear);
        }

        btnWeek.addEventListener('click', () => switchChart('week'));
        btnMonth.addEventListener('click', () => switchChart('month'));
        btnYear.addEventListener('click', () => switchChart('year'));

        // Default active state: Month
        setActiveBtn(btnMonth);

    } catch (error) {
        console.error("Dashboard failed to load:", error);
        document.getElementById('loadingIndicator').textContent = "Failed to load dashboard data. Check backend connection.";
        document.getElementById('loadingIndicator').className = "text-center py-10 text-red-500";
    }
});
