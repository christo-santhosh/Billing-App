// auth.js - Include this at the TOP of every protected page (index, inventory, sales, etc.)
// It will immediately check session status and redirect to login if not authenticated.
document.addEventListener('DOMContentLoaded', async () => {
    try {
        const response = await fetch('/api/auth/session/', {
            method: 'GET',
            headers: {
                'Accept': 'application/json'
            },
            // Ensure cookies are sent
            credentials: 'same-origin' 
        });

        if (!response.ok) {
            // Not authenticated -> kick to login
            window.location.href = '/login.html';
        } else {
            const data = await response.json();
            // Optional: You could display the username in the top right corner
            console.log("Logged in as:", data.username);
            
            // Expose logout globally so any page can call it
            window.logoutUser = async () => {
                try {
                    await fetch('/api/auth/logout/', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
                            // Add CSRF Token manually here if you want, 
                            // or rely on api.js. Since logout is standalone here:
                            'X-CSRFToken': getCookie('csrftoken')
                        },
                        credentials: 'same-origin'
                    });
                } finally {
                    window.location.href = '/login.html';
                }
            };
        }
    } catch (error) {
        console.error("Session check failed, redirecting to login:", error);
        window.location.href = '/login.html';
    }
});
