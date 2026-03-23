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

// Fetch an authenticated HTML receipt and open it in a new tab as a Blob URL.
// window.open() alone doesn't send the Authorization header, so we fetch
// the HTML via axios (which includes the token) and open the blob instead.
export async function openPrintPage(path: string) {
  const res = await api.get<string>(path, { responseType: 'text' })
  const blob = new Blob([res.data], { type: 'text/html' })
  const url  = URL.createObjectURL(blob)
  const win  = window.open(url, '_blank')
  // Revoke the blob URL once the new tab has loaded to free memory
  if (win) win.addEventListener('load', () => URL.revokeObjectURL(url))
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
