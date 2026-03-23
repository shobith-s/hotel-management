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

// Fetch an authenticated HTML receipt and print it via a full-screen iframe.
// Avoids popup blockers entirely — the iframe lives in the same document/origin
// so document.write and contentWindow.print() always work.
export async function openPrintPage(path: string) {
  const res = await api.get<string>(path, { responseType: 'text' })

  // Full-screen overlay iframe
  const iframe = document.createElement('iframe')
  iframe.style.cssText =
    'position:fixed;inset:0;width:100%;height:100%;border:none;z-index:9999;background:#fff'
  document.body.appendChild(iframe)

  // Close button (hidden during print via @media print)
  const closeBtn = document.createElement('button')
  closeBtn.textContent = '✕ Close'
  closeBtn.style.cssText =
    'position:fixed;top:16px;right:16px;z-index:10000;padding:8px 20px;' +
    'background:#111;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px;' +
    'font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,0.3)'
  closeBtn.onclick = () => {
    document.body.removeChild(iframe)
    document.body.removeChild(closeBtn)
  }
  document.body.appendChild(closeBtn)

  // Write receipt HTML into iframe (same origin — always works)
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(res.data)
  doc.close()

  // Trigger print after render; close overlay after print dialog closes
  setTimeout(() => {
    iframe.contentWindow?.print()
  }, 300)
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
