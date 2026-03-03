// Dynamically resolve the API base URL from the current page's host.
// This works on localhost, ngrok, or any production domain automatically.
const BASE_URL = `${window.location.protocol}//${window.location.host}/api`;

/**
 * Helper function to handle API calls
 */
async function fetchAPI(endpoint, options = {}) {
    const url = `${BASE_URL}${endpoint}`;

    const defaultHeaders = {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const config = {
        ...options,
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
