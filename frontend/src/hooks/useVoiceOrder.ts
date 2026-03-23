import { useCallback, useRef, useState } from 'react'
import Fuse from 'fuse.js'
import type { MenuCategory, MenuItem, MenuItemVariant } from '../api/menu'

export interface VoiceParsedItem {
  menuItem: MenuItem
  variant: MenuItemVariant
  quantity: number
}

// Word-to-number map (English + common Hindi numerals)
const WORD_NUMS: Record<string, number> = {
  one: 1, two: 2, three: 3, four: 4, five: 5,
  six: 6, seven: 7, eight: 8, nine: 9, ten: 10,
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5,
  chhe: 6, saat: 7, aath: 8, nau: 9, das: 10,
  a: 1, an: 1,
}

function parseQuantity(token: string): number {
  const n = parseInt(token, 10)
  if (!isNaN(n)) return n
  return WORD_NUMS[token.toLowerCase()] ?? 1
}

// Extract quantity prefix from a phrase like "two paneer masala"
function extractQtyAndRest(tokens: string[]): [number, string[]] {
  if (tokens.length === 0) return [1, tokens]
  const first = tokens[0].toLowerCase()
  const qty = WORD_NUMS[first] ?? parseInt(first, 10)
  if (!isNaN(qty) && qty > 0) return [qty, tokens.slice(1)]
  return [1, tokens]
}

// Split transcript on conjunctions/separators
function splitPhrases(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .split(/\band\b|,|;|\bplus\b|\baur\b/)
    .map((s) => s.trim())
    .filter(Boolean)
}

export interface UseVoiceOrderResult {
  listening: boolean
  startListening: () => void
  stopListening: () => void
  supported: boolean
  error: string | null
}

export function useVoiceOrder(
  menu: MenuCategory[],
  onResult: (items: VoiceParsedItem[], transcript: string) => void,
): UseVoiceOrderResult {
  const [listening, setListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = typeof window !== 'undefined' ? (window as any) : null
  const supported = !!w && ('SpeechRecognition' in w || 'webkitSpeechRecognition' in w)

  // Build flat list of all menu items for fuzzy search
  const allItems = menu.flatMap((cat) => cat.items)

  const fuse = new Fuse(allItems, {
    keys: ['name'],
    threshold: 0.4,
    includeScore: true,
  })

  const parseTranscript = useCallback(
    (transcript: string): VoiceParsedItem[] => {
      const phrases = splitPhrases(transcript)
      const parsed: VoiceParsedItem[] = []

      for (const phrase of phrases) {
        const tokens = phrase.split(/\s+/).filter(Boolean)
        const [qty, rest] = extractQtyAndRest(tokens)
        const query = rest.join(' ')
        if (!query) continue

        const results = fuse.search(query)
        if (results.length === 0) continue

        const bestItem = results[0].item
        // Pick default variant
        const variant =
          bestItem.variants.find((v) => v.is_default) ?? bestItem.variants[0]
        if (!variant) continue

        // Merge with existing if same item+variant already added
        const existing = parsed.find(
          (p) => p.menuItem.id === bestItem.id && p.variant.id === variant.id,
        )
        if (existing) {
          existing.quantity += qty
        } else {
          parsed.push({ menuItem: bestItem, variant, quantity: qty })
        }
      }

      return parsed
    },
    [menu], // eslint-disable-line react-hooks/exhaustive-deps
  )

  const startListening = useCallback(() => {
    if (!supported) {
      setError('Voice input is not supported in this browser. Use Chrome or Edge.')
      return
    }
    setError(null)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionCtor = (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition: any = new SpeechRecognitionCtor()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.maxAlternatives = 1

    recognition.onstart = () => setListening(true)
    recognition.onend = () => setListening(false)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onerror = (e: any) => {
      setListening(false)
      if (e.error !== 'no-speech') setError(`Voice error: ${e.error}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript
      const items = parseTranscript(transcript)
      onResult(items, transcript)
    }

    recognitionRef.current = recognition
    recognition.start()
  }, [supported, parseTranscript, onResult])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { listening, startListening, stopListening, supported, error }
}
