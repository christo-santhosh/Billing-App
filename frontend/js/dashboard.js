document.addEventListener('DOMContentLoaded', async () => {
    // Mobile Sidebar Toggle
    const sidebar = document.getElementById('sidebar');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const openSidebarBtn = document.getElementById('openSidebar');
    const closeSidebarBtn = document.getElementById('closeSidebar');

    function toggleSidebar() {
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

    // Load Dashboard Data
    try {
        const [wardAnalysis, wardsResponse, revenueData] = await Promise.all([
            fetchAPI('/analytics/ward_wise_analysis/'),
            fetchAPI('/wards/'),
            fetchAPI('/analytics/time_based_revenue/')
        ]);

        document.getElementById('loadingIndicator').classList.add('hidden');
        const dashContent = document.getElementById('dashboardContent');
        dashContent.classList.remove('hidden');
        dashContent.style.display = 'flex';

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

        const dotColors = ['dot-green', 'dot-purple', 'dot-emerald', 'dot-orange', 'dot-pink', 'dot-blue'];

        wardAnalysis.ward_revenue.forEach((ward, index) => {
            const revenue = parseFloat(ward.total_revenue || 0);
            totalRevenueAllTime += revenue;

            const dotClass = dotColors[index % dotColors.length];
            const itemHTML = `
                <div class="ward-breakdown-item">
                    <div class="flex-row gap-md">
                        <span class="dot ${dotClass}"></span>
                        <span class="text-sm medium text-dark">${ward.ward_name}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-sm bold text-dark" style="display:block;">${formatCurrency(revenue)}</span>
                        <span class="text-xs text-light">${ward.purchase_count} Orders</span>
                    </div>
                </div>
            `;
            bdList.insertAdjacentHTML('beforeend', itemHTML);
        });

        document.getElementById('statTotalRevenue').textContent = formatCurrency(totalRevenueAllTime);

        // ── Revenue Chart ──────────────────────────────────────────────────
        function prepareChartData(records, dateKey, count = 10) {
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

        function setActiveBtn(active) {
            [btnWeek, btnMonth, btnYear].forEach(btn => {
                btn.classList.remove('active');
                if (btn === active) btn.classList.add('active');
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
        document.getElementById('loadingIndicator').className = "text-center p-md text-red";
    }
});
