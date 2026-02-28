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

    } catch (error) {
        console.error("Dashboard failed to load:", error);
    }
});
