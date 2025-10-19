// src/api/api.ts

import { API_BASE_URL } from '@env'; // <-- The critical change is here
import { apiFetch } from './authService';

// The API_BASE_URL is now imported directly and type-safely.
console.log('API_BASE_URL:', API_BASE_URL);

export async function getSomething() {
  // Your logic remains identical
  const res = await apiFetch(`${API_BASE_URL}/something/`, { method: 'GET' });
  if (!res.ok) throw new Error('Failed to fetch something');
  return res.json();
}

export async function testNetworkConnection() {
  // This function needs no changes as it uses standard fetch
  try {
    console.log('🌐 Testing network connection...');
    // Note: The 'timeout' option is not a standard part of the fetch API.
    // If you need a timeout, you must implement it with AbortController.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch('https://httpbin.org/get', {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId); // Clear the timeout if the request succeeds

    console.log('✅ Network test successful:', response.status);
    return true;
  } catch (error) {
    if (error.name === 'AbortError') {
      console.error('❌ Network test failed: Request timed out');
    } else {
      console.error('❌ Network test failed:', error);
    }
    return false;
  }
}
