import axios from 'axios'

// Centralized Axios instance
// In dev, Vite proxy forwards /api -> http://localhost:5000
// In production, set VITE_API_BASE to your backend URL
const axiosInstance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  withCredentials: true, // Send HTTP-only cookies with every request
  headers: {
    'Content-Type': 'application/json',
  },
})

// Response interceptor for consistent error handling
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Extract the API error message if available
    const message =
      error.response?.data?.message ||
      error.response?.data?.errors?.[0]?.msg ||
      error.message ||
      'Something went wrong'

    const apiError = new Error(message)
    apiError.status = error.response?.status
    apiError.data = error.response?.data
    return Promise.reject(apiError)
  }
)

export default axiosInstance
