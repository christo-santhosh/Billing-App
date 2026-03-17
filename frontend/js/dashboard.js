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
                    <td class="p-md text-sm text-dark">${formatDate(inv.date)}</td>
                    <td class="p-md">
                        <p class="text-sm bold text-dark m-0">${inv.family_name}</p>
                        <p class="text-xs text-muted m-0">${inv.head_name}</p>
                    </td>
                    <td class="p-md text-sm bold text-dark" style="text-align:right;">${formatCurrency(inv.total_amount)}</td>
                    <td class="p-md" style="text-align:right;">
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
    
    // ── Swiper Dots Logic ──────────────────────────────────────────
    const statsGrid = document.querySelector('.stats-grid');
    const dots = document.querySelectorAll('#statsIndicator .dot');
    
    if (statsGrid && dots.length > 0) {
        statsGrid.addEventListener('scroll', () => {
            const maxScrollLeft = statsGrid.scrollWidth - statsGrid.clientWidth;
            let activeIndex = 0;
            
            if (maxScrollLeft > 0) {
                const scrollFraction = statsGrid.scrollLeft / maxScrollLeft;
                activeIndex = Math.round(scrollFraction * (dots.length - 1));
            }
            
            dots.forEach((dot, index) => {
                if (index === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        });
    }

    // ── Settings Modal Logic ────────────────────────────────────────
    const settingsModal = document.getElementById('settingsModal');
    const settingsForm = document.getElementById('settingsForm');

    window.openSettingsModal = async function() {
        if (settingsModal) settingsModal.classList.add('show');
        try {
            const settings = await fetchAPI('/settings/');
            document.getElementById('upiIdInput').value = settings.upi_id || '';
            document.getElementById('merchantNameInput').value = settings.merchant_name || '';
        } catch (e) {
            console.error("Failed to load settings:", e);
        }
    }

    window.closeSettingsModal = function() {
        if (settingsModal) settingsModal.classList.remove('show');
    }

    if (settingsForm) {
        settingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('saveSettingsBtn');
            const upi_id = document.getElementById('upiIdInput').value;
            const merchant_name = document.getElementById('merchantNameInput').value;

            try {
                btn.innerHTML = '<span class="material-symbols-outlined spin">sync</span> Saving...';
                btn.disabled = true;

                await fetchAPI('/settings/', {
                    method: 'PUT',
                    body: JSON.stringify({ upi_id, merchant_name })
                });

                closeSettingsModal();
                alert("Settings saved successfully!"); // Optional success feedback
            } catch (err) {
                alert(err.message || "Failed to save settings.");
            } finally {
                btn.innerHTML = 'Save Settings';
                btn.disabled = false;
            }
        });
    }
});
