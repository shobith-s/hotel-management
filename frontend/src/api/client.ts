import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:8000/api/v1',
})

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// If the server returns 401 (token expired / invalid), log the user out
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Open a print receipt in a new tab.
// Token is passed as a query param so the browser can navigate directly
// without needing an Authorization header (no fetch/iframe needed).
export function openPrintPage(path: string) {
  const token = localStorage.getItem('token')
  if (!token) return
  const url = `http://localhost:8000/api/v1${path}?token=${encodeURIComponent(token)}`
  window.open(url, '_blank')
}

export async function logout() {
  try {
    await api.post('/auth/logout')
  } finally {
    localStorage.removeItem('token')
    window.location.href = '/login'
  }
}

export default api
