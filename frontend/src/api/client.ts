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
// IMPORTANT: window.open() must be called synchronously within the click
// handler (before any await) — otherwise popup blockers silently block it.
export async function openPrintPage(path: string) {
  // 1. Open window immediately — still inside the user gesture
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write('<html><body style="font-family:sans-serif;padding:24px;color:#555">Loading receipt…</body></html>')

  // 2. Fetch HTML with auth token
  const res = await api.get<string>(path, { responseType: 'text' })

  // 3. Replace placeholder with real receipt and trigger print
  win.document.open()
  win.document.write(res.data)
  win.document.close()
  setTimeout(() => win.print(), 300)
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
