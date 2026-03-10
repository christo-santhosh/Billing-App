// Dynamically resolve the API base URL from the current page's host.
// This works on localhost, ngrok, or any production domain automatically.
const BASE_URL = `${window.location.protocol}//${window.location.host}/api`;

// Helper function to get a cookie by name
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            // Does this cookie string begin with the name we want?
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

/**
 * Helper function to handle API calls
 */
async function fetchAPI(endpoint, options = {}) {
    // If endpoint starts with /api/, use it directly, else prepend BASE_URL
    const url = endpoint.startsWith('http') ? endpoint : (endpoint.startsWith('/api') ? endpoint : `${BASE_URL}${endpoint}`);

    const defaultHeaders = {
        'Accept': 'application/json'
    };

    // If body is NOT FormData, default to application/json
    if (!(options.body instanceof FormData)) {
        defaultHeaders['Content-Type'] = 'application/json';
    }

    // Attach CSRF Token for state-changing methods
    const method = options.method ? options.method.toUpperCase() : 'GET';
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
        const csrfToken = getCookie('csrftoken');
        if (csrfToken) {
            defaultHeaders['X-CSRFToken'] = csrfToken;
        }
    }

    const config = {
        ...options,
        // Ensure credentials (cookies) are sent with every single request
        credentials: 'same-origin',
        headers: {
            ...defaultHeaders,
            ...options.headers
        }
    };

    try {
        const response = await fetch(url, config);

        // Handle PDF downloads specially
        if (options.isDownload) {
            if (!response.ok) throw new Error('Failed to download file');
            return await response.blob();
        }

        // If unauthorized or forbidden and we're NOT already trying to login/check session, kick to login
        if ((response.status === 401 || response.status === 403) && !endpoint.includes('/auth/')) {
            window.location.href = '/login.html';
            throw new Error('Unauthorized');
        }

        const data = await response.json();

        if (!response.ok) {
            console.error('API Error:', data);
            let errorMsg = data.message || 'Something went wrong';
            if (typeof data === 'object' && !data.message) {
                const firstKey = Object.keys(data)[0];
                if (firstKey && Array.isArray(data[firstKey])) {
                    errorMsg = typeof data[firstKey][0] === 'string' ? data[firstKey][0] : JSON.stringify(data[firstKey][0]);
                } else if (typeof data.detail === 'string') {
                    errorMsg = data.detail;
                }
            }
            throw new Error(errorMsg);
        }

        // DRF paginated responses return { count, next, previous, results }
        // We generally just want the results for our lists
        return data.results !== undefined ? data.results : data;
    } catch (error) {
        console.error(`Error fetching ${endpoint}:`, error);
        throw error;
    }
}

// Global utility for formatting currency
function formatCurrency(amount) {
    return '₹' + Number(amount).toFixed(2);
}

// Global utility for formatting dates
function formatDate(dateString) {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
    }).format(date);
}
