document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    const loginError = document.getElementById('loginError');
    const loginBtn = document.getElementById('loginBtn');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Remove auth.js check from this page if it accidentally gets included
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = usernameInput.value.trim();
        const password = passwordInput.value;
        
        if (!username || !password) return;

        // Visual feedback
        const originalBtnText = loginBtn.innerHTML;
        loginBtn.innerHTML = `<span>Signing in...</span>`;
        loginBtn.disabled = true;
        loginError.style.display = 'none';

        try {
            // We use standard fetch here initially to avoid api.js interceptors that might redirect
            const response = await fetch('/api/auth/login/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin', // Save the session cookie
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                // Login successful, redirect to dashboard
                window.location.href = '/';
            } else {
                throw new Error(data.detail || 'Login failed');
            }
        } catch (error) {
            loginError.textContent = error.message;
            loginError.style.display = 'block';
            loginBtn.innerHTML = originalBtnText;
            loginBtn.disabled = false;
        }
    });
});
