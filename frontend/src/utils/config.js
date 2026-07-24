// Centralized API configuration
// Set VITE_API_URL in your .env file for production
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Build an authenticated fetch request to the Zaheer's AI API.
 * @param {string} path - API path (e.g. '/api/chat/history')
 * @param {RequestInit} [init] - fetch options (headers, body, method, etc.)
 */
export const apiFetch = (path, init) => {
  return fetch(`${API_BASE_URL}${path}`, init);
};
