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

// Fetch an authenticated HTML receipt and print it.
// Opens a new window, writes the HTML directly into it, then triggers
// the browser's native print dialog (Ctrl+P / Save as PDF).
export async function openPrintPage(path: string) {
  const res = await api.get<string>(path, { responseType: 'text' })
  const win = window.open('', '_blank')
  if (!win) return
  win.document.open()
  win.document.write(res.data)
  win.document.close()
  // Trigger print once the content has rendered
  win.onload = () => win.print()
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
