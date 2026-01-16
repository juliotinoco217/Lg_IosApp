/**
 * API Configuration
 *
 * Uses environment variable in production, falls back to localhost for development.
 *
 * For Railway deployment:
 * - Set VITE_API_URL to your backend Railway URL (e.g., https://your-backend.up.railway.app)
 *
 * For local development:
 * - No configuration needed, defaults to localhost:3001
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'
