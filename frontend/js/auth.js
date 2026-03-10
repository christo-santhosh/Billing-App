// auth.js - Include this at the TOP of every protected page (index, inventory, sales, etc.)
// It will immediately check session status and redirect to login if not authenticated.

// Inject CSS immediately to hide the body until we verify auth
const style = document.createElement('style');
style.textContent = 'body { display: none !important; }';
document.documentElement.appendChild(style);

async function checkAuth() {
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
            // Not authenticated -> kick to login (body stays hidden)
            window.location.replace('/login.html');
        } else {
            const data = await response.json();
            console.log("Logged in as:", data.username);
            
            // Authentication passed -> Reveal the body!
            document.documentElement.removeChild(style);
            
            // Expose logout globally so any page can call it
            window.logoutUser = async () => {
                try {
                    await fetch('/api/auth/logout/', {
                        method: 'POST',
                        headers: {
                            'Accept': 'application/json',
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
        window.location.replace('/login.html');
    }
}

// Run immediately, don't wait for DOMContentLoaded
checkAuth();
