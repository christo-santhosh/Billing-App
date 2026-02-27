document.addEventListener('DOMContentLoaded', async () => {
    // Set greeting based on time of day
    const hour = new Date().getHours();
    let greeting = 'Good Morning';
    if (hour >= 12 && hour < 17) greeting = 'Good Afternoon';
    else if (hour >= 17) greeting = 'Good Evening';
    document.getElementById('greetingTime').textContent = greeting;

    // Load Dashboard Data
    try {
        const [wardAnalysis, revenueData] = await Promise.all([
            fetchAPI('/analytics/ward_wise_analysis/'),
            fetchAPI('/analytics/time_based_revenue/')
        ]);

        document.getElementById('loadingIndicator').classList.add('hidden');
        const dashContent = document.getElementById('dashboardContent');
        dashContent.classList.remove('hidden');
        dashContent.style.display = 'flex';

        // Monthly Revenue (latest month)
        const monthly = revenueData.monthly || [];
        if (monthly.length > 0) {
            const latest = monthly[monthly.length - 1];
            document.getElementById('statMonthlyRevenue').textContent = formatCurrency(parseFloat(latest.revenue || 0));

            // Calculate % change from previous month
            if (monthly.length > 1) {
                const prev = parseFloat(monthly[monthly.length - 2].revenue || 0);
                const curr = parseFloat(latest.revenue || 0);
                if (prev > 0) {
                    const change = ((curr - prev) / prev * 100).toFixed(0);
                    const badge = document.getElementById('statRevenueChange');
                    if (change >= 0) {
                        badge.textContent = `↑ ${change}%`;
                        badge.className = 'badge badge-green';
                    } else {
                        badge.textContent = `↓ ${Math.abs(change)}%`;
                        badge.className = 'badge badge-red';
                    }
                }
            }
        }

        // ── Revenue Line Chart ─────────────────────────────────────────
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

        const lineChart = new Chart(ctx, {
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
                        callbacks: { label: c => ' ₹' + c.parsed.y.toFixed(2) },
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

        // Toggle buttons
        const btnWeek = document.getElementById('btnWeek');
        const btnMonth = document.getElementById('btnMonth');
        const btnYear = document.getElementById('btnYear');

        function setActiveBtn(active) {
            [btnWeek, btnMonth, btnYear].forEach(btn => {
                btn.classList.toggle('active', btn === active);
            });
        }

        function switchChart(period) {
            const d = datasets[period];
            lineChart.data.labels = d.labels;
            lineChart.data.datasets[0].data = d.values;
            lineChart.data.datasets[0].backgroundColor = makeGradient();
            lineChart.update();
            setActiveBtn(period === 'week' ? btnWeek : period === 'month' ? btnMonth : btnYear);
        }

        btnWeek.addEventListener('click', () => switchChart('week'));
        btnMonth.addEventListener('click', () => switchChart('month'));
        btnYear.addEventListener('click', () => switchChart('year'));

        // ── Ward Doughnut Chart ────────────────────────────────────────
        const wardColors = ['#16a34a', '#10b981', '#a855f7', '#f97316', '#ec4899', '#3b82f6'];
        const wardData = wardAnalysis.ward_revenue || [];

        let totalOrders = 0;
        const wardLabels = [];
        const wardValues = [];

        wardData.forEach(w => {
            wardLabels.push(w.ward_name);
            wardValues.push(parseFloat(w.total_revenue || 0));
            totalOrders += w.purchase_count || 0;
        });

        document.getElementById('totalOrders').textContent = totalOrders;

        const dCtx = document.getElementById('wardDoughnut').getContext('2d');
        new Chart(dCtx, {
            type: 'doughnut',
            data: {
                labels: wardLabels,
                datasets: [{
                    data: wardValues,
                    backgroundColor: wardColors.slice(0, wardLabels.length),
                    borderWidth: 0,
                    hoverOffset: 8,
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                cutout: '70%',
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        callbacks: { label: c => ` ${c.label}: ${formatCurrency(c.parsed)}` },
                        backgroundColor: '#fff',
                        titleColor: '#475569',
                        bodyColor: '#16a34a',
                        bodyFont: { weight: 'bold' },
                        borderColor: '#bbf7d0',
                        borderWidth: 1,
                        padding: 10,
                    }
                },
            }
        });

        // Render legend
        const totalRevenue = wardValues.reduce((s, v) => s + v, 0);
        const legendContainer = document.getElementById('wardLegend');

        wardData.forEach((w, idx) => {
            const revenue = parseFloat(w.total_revenue || 0);
            const percent = totalRevenue > 0 ? ((revenue / totalRevenue) * 100).toFixed(0) : 0;
            const color = wardColors[idx % wardColors.length];

            legendContainer.insertAdjacentHTML('beforeend', `
                <div class="legend-row">
                    <div class="flex-row gap-sm">
                        <span class="legend-dot" style="background:${color};"></span>
                        <span class="text-sm medium text-dark">${w.ward_name}</span>
                    </div>
                    <div class="text-right">
                        <span class="text-sm bold text-dark">${percent}%</span>
                        <span class="text-xs text-light" style="display:block;">${formatCurrency(revenue)}</span>
                    </div>
                </div>
            `);
        });

    } catch (error) {
        console.error("Dashboard failed to load:", error);
        document.getElementById('loadingIndicator').textContent = "Failed to load dashboard data.";
        document.getElementById('loadingIndicator').className = "text-center p-md text-red";
    }
});
