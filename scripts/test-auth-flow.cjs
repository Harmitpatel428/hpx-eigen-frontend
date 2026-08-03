const axios = require('axios');

// Mock localStorage globally before any requests fire
global.localStorage = {
  store: {},
  getItem(key) { return this.store[key] || null; },
  setItem(key, value) { this.store[key] = value; },
  removeItem(key) { delete this.store[key]; }
};

const api = axios.create({
  baseURL: 'http://localhost:3000/api/v1',
  headers: { 'Content-Type': 'application/json' }
});

// Mimic the interceptor logic
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('hpx:access-token') || localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

async function run() {
  try {
    // 1. Login
    console.log('--- ATTEMPTING LOGIN ---');
    const loginRes = await api.post('/auth/login', {
      email: 'test@hpx.com',
      password: 'password123'
    });

    console.log('Login Raw Response:', JSON.stringify(loginRes.data, null, 2));

    // 2. Extract Token (Try all possible paths)
    const token = loginRes.data?.data?.accessToken || loginRes.data?.accessToken;
    
    if (!token) {
      console.error('FATAL: Could not extract token from response!');
      process.exit(1);
    }

    console.log('Extracted Token:', token.substring(0, 20) + '...');

    // 3. Save to localStorage (Simulating browser)
    localStorage.setItem('hpx:access-token', token);
    localStorage.setItem('accessToken', token);

    // 4. Fetch /users/me
    console.log('--- ATTEMPTING /users/me ---');
    const meRes = await api.get('/users/me');
    
    console.log('Me Status:', meRes.status);
    console.log('Me Response Data:', JSON.stringify(meRes.data, null, 2));
    
  } catch (error) {
    console.error('ERROR:', error.response?.status, error.response?.data || error.message);
  }
}

run();
