import { useCallback, useRef, useState } from 'react'
import FlexSearch from 'flexsearch'
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

// Filler words to strip before matching
const FILLER = new Set([
  'give', 'me', 'i', 'want', 'please', 'order', 'get', 'bring',
  'some', 'the', 'a', 'an', 'of', 'with', 'and', 'aur', 'ek',
])

function extractQtyAndRest(tokens: string[]): [number, string[]] {
  if (tokens.length === 0) return [1, tokens]
  const first = tokens[0].toLowerCase()
  const numVal = parseInt(first, 10)
  if (!isNaN(numVal) && numVal > 0) return [numVal, tokens.slice(1)]
  const wordVal = WORD_NUMS[first]
  if (wordVal) return [wordVal, tokens.slice(1)]
  return [1, tokens]
}

function splitPhrases(transcript: string): string[] {
  return transcript
    .toLowerCase()
    .split(/\band\b|,|;|\bplus\b|\baur\b/)
    .map((s) => s.trim())
    .filter(Boolean)
}

function stripFillers(tokens: string[]): string[] {
  return tokens.filter((t) => !FILLER.has(t))
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

  const allItems = menu.flatMap((cat) => cat.items)

  // Build FlexSearch index — word-level tokenization + phonetic encoding
  const buildIndex = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const index = new (FlexSearch.Index as any)({
      tokenize: 'forward',   // matches partial words: "pan" → "paneer"
      encoder: 'soundex',    // phonetic: "panneer" → "paneer"
    })
    allItems.forEach((item, i) => index.add(i, item.name))
    return index
  }, [menu]) // eslint-disable-line react-hooks/exhaustive-deps

  const parseTranscript = useCallback(
    (transcript: string): VoiceParsedItem[] => {
      const index = buildIndex()
      const phrases = splitPhrases(transcript)
      const parsed: VoiceParsedItem[] = []

      for (const phrase of phrases) {
        const tokens = phrase.split(/\s+/).filter(Boolean)
        const [qty, rest] = extractQtyAndRest(tokens)
        const cleaned = stripFillers(rest)
        const query = cleaned.join(' ')
        if (!query) continue

        const results = index.search(query, { limit: 1 }) as number[]
        if (results.length === 0) continue

        const bestItem = allItems[results[0]]
        if (!bestItem) continue

        const variant =
          bestItem.variants.find((v) => v.is_default) ?? bestItem.variants[0]
        if (!variant) continue

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
    [buildIndex, allItems],
  )

  const startListening = useCallback(() => {
    if (!supported) {
      setError('Voice input not supported. Use Chrome or Edge.')
      return
    }
    setError(null)

    const SpeechRecognitionCtor = w.SpeechRecognition ?? w.webkitSpeechRecognition
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
  }, [supported, parseTranscript, onResult, w])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  return { listening, startListening, stopListening, supported, error }
}
