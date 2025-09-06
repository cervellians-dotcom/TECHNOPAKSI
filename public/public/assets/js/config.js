// API Configuration
const API_URL = 'http://localhost:3000/api';

const config = {
  api: {
    register: `${API_URL}/register`,
    login: `${API_URL}/login`,
    profile: `${API_URL}/profile`,
    locations: `${API_URL}/locations`,
    vouchers: `${API_URL}/vouchers`,
    redeemVoucher: `${API_URL}/vouchers/redeem`,
    // Admin endpoints
    adminStats: `${API_URL}/admin/stats`,
    // Upload endpoints
    uploads: `${API_URL}/uploads`
  }
};

// Helper function to make authenticated API calls
async function apiCall(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const defaultOptions = {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  };

  // If the body is FormData, don't set Content-Type (browser will set it with boundary)
  if (!(options.body instanceof FormData)) {
    defaultOptions.headers['Content-Type'] = 'application/json';
    if (options.body) {
      options.body = JSON.stringify(options.body);
    }
  }

  try {
    const response = await fetch(endpoint, { 
      ...defaultOptions, 
      ...options,
      headers: {
        ...defaultOptions.headers,
        ...(options.headers || {})
      }
    });

    // Check if the response is JSON
    const contentType = response.headers.get('content-type');
    let data;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    if (!response.ok) {
      throw new Error(data.error || 'Something went wrong');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

// Expose to window
window.config = config;
window.apiCall = apiCall; 