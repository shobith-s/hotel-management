import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import TopBar from '../components/shared/TopBar'
import { getSettings, updateSettings, type HotelSettings } from '../api/settings'

function Field({
  label, name, value, onChange, hint, placeholder,
}: {
  label: string
  name: keyof HotelSettings
  value: string
  onChange: (k: keyof HotelSettings, v: string) => void
  hint?: string
  placeholder?: string
}) {
  return (
    <div>
      <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
        {label}
      </label>
      <input
        type="text"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(name, e.target.value)}
        className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
      />
      {hint && <p className="text-xs text-on-surface-variant mt-1">{hint}</p>}
    </div>
  )
}

export default function SettingsPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<HotelSettings | null>(null)
  const [saved, setSaved] = useState(false)

  const { data: settingsData, isLoading } = useQuery<HotelSettings>({
    queryKey: ['settings'],
    queryFn: getSettings,
  })

  useEffect(() => {
    if (settingsData && !form) setForm(settingsData)
  }, [settingsData])

  const saveMutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (data) => {
      setForm(data)
      qc.setQueryData(['settings'], data)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    },
  })

  function handleChange(key: keyof HotelSettings, value: string) {
    setForm((prev) => prev ? { ...prev, [key]: value } : prev)
    setSaved(false)
  }

  function handleNumber(key: keyof HotelSettings, value: string) {
    const n = parseFloat(value)
    setForm((prev) => prev ? { ...prev, [key]: isNaN(n) ? 0 : n } : prev)
    setSaved(false)
  }

  if (isLoading || !form) {
    return (
      <div className="flex-1 overflow-y-auto bg-surface">
        <TopBar />
        <div className="p-10 text-sm text-on-surface-variant animate-pulse">Loading…</div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-surface">
      <TopBar />
      <div className="p-10 max-w-2xl mx-auto">
        <div className="mb-10">
          <h1 className="font-headline text-4xl font-bold text-primary tracking-tight">Hotel Settings</h1>
          <p className="text-on-surface-variant mt-1 text-sm">Configure hotel details printed on bills and receipts</p>
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-card space-y-6">
          <Field
            label="Hotel Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Hotel Sukhsagar"
          />
          <Field
            label="Address"
            name="address"
            value={form.address}
            onChange={handleChange}
            placeholder="Miraj, Maharashtra"
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Phone"
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="+91 98765 43210"
            />
            <Field
              label="GSTIN"
              name="gstin"
              value={form.gstin}
              onChange={handleChange}
              placeholder="27AABCU9603R1ZX"
              hint="15-digit GST Identification Number"
            />
          </div>
          <Field
            label="UPI ID"
            name="upi_id"
            value={form.upi_id}
            onChange={handleChange}
            placeholder="hotel@upi"
            hint="If set, a scannable UPI QR code will appear on printed bills"
          />
          <Field
            label="Logo URL"
            name="logo_url"
            value={form.logo_url}
            onChange={handleChange}
            placeholder="https://example.com/logo.png"
            hint="Optional — hosted image URL for future use"
          />
        </div>

        <div className="bg-surface-container-lowest rounded-2xl p-8 shadow-card space-y-6 mt-6">
          <h2 className="font-headline text-lg font-bold text-on-surface">Billing &amp; Operations</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
                Service Charge (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={form.service_charge_pct}
                onChange={(e) => handleNumber('service_charge_pct', e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-on-surface-variant mt-1">Applied to restaurant bills when enabled</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-widest text-on-surface-variant mb-1.5">
                Default Check-out Time
              </label>
              <input
                type="time"
                value={form.default_checkout_time}
                onChange={(e) => handleChange('default_checkout_time', e.target.value)}
                className="w-full bg-surface-container-low border border-outline-variant/30 rounded-xl px-4 py-3 text-sm text-primary focus:outline-none focus:border-primary transition-colors"
              />
              <p className="text-xs text-on-surface-variant mt-1">Pre-filled on new check-in forms</p>
            </div>
          </div>
        </div>

        <div className="mt-8 flex items-center gap-4">
          <button
            onClick={() => saveMutation.mutate(form)}
            disabled={saveMutation.isPending}
            className="btn-primary px-8 py-3 flex items-center gap-2 disabled:opacity-40"
          >
            <span className="material-symbols-outlined text-xl">save</span>
            {saveMutation.isPending ? 'Saving…' : 'Save Settings'}
          </button>

          {saved && (
            <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
              <span className="material-symbols-outlined text-base">check_circle</span>
              Saved successfully
            </span>
          )}

          {saveMutation.isError && (
            <span className="text-sm text-error">
              {(saveMutation.error as any)?.response?.data?.detail ?? 'Failed to save'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
