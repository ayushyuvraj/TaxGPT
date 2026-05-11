import { useState } from 'react'
import { getApiHeaders } from '../lib/api'
import type { Source } from '../lib/types'

export interface QAGenNextRequest {
  question: string
  chat_history: Array<{ question: string; answer: string }>
  language: string
  doc_context?: string
  is_invoice?: boolean
}

export const useQAGenNextStream = () => {
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamError, setStreamError] = useState<string | null>(null)
  const [streamSources, setStreamSources] = useState<Source[]>([])
  const [usedDocument, setUsedDocument] = useState<string | undefined>(undefined)

  const streamQuery = async (
    request: QAGenNextRequest,
    docFilename?: string,
    onMessageComplete?: (question: string, answer: string, sources: Source[], usedDoc?: string) => void
  ) => {
    setUsedDocument(docFilename)
    setIsStreaming(true)
    setStreamingAnswer('')
    setStreamSources([])
    setStreamError(null)

    try {
      const headers = getApiHeaders()
      const res = await fetch('/api/v1/qa-gennext/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(request),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { detail?: string }).detail ?? `Request failed: ${res.status}`)
      }

      const reader = res.body!.getReader()
      const decoder = new TextDecoder()
      let accumulated = ''
      let finalSources: Source[] = []

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const lines = decoder.decode(value, { stream: true }).split('\n')
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const payload = JSON.parse(line.slice(6)) as {
              chunk?: string
              sources?: Source[]
              done?: boolean
            }
            if (payload.chunk) {
              accumulated += payload.chunk
              setStreamingAnswer(accumulated)
            }
            if (payload.done) {
              finalSources = payload.sources ?? []
              setStreamSources(finalSources)
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }

      // Always clean up — handles both normal completion and stream-closed-early
      if (onMessageComplete) {
        onMessageComplete(request.question, accumulated, finalSources, usedDocument)
      }
      setIsStreaming(false)
      setStreamingAnswer('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error'
      setStreamError(msg)
      setIsStreaming(false)
      setStreamingAnswer('')
    }
  }

  return { streamQuery, streamingAnswer, isStreaming, streamError, streamSources, usedDocument }
}
