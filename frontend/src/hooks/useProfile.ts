import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient, { getApiHeaders } from '../lib/api'
import type { ProfileListResponse, ProfileResponse, Source, TaxComputationResponse, ProfileInputsData } from '../lib/types'

export type { ProfileInputsData }

export const useProfiles = () => {
  return useQuery({
    queryKey: ['profiles'],
    queryFn: async () => {
      const response = await apiClient.get<ProfileListResponse>('/profiles')
      return response.data
    },
  })
}

export const useProfileAnalysis = () => {
  return useMutation({
    mutationFn: async (profileType: string) => {
      const response = await apiClient.post<ProfileResponse>(
        '/profiles/analyze',
        { profile_type: profileType }
      )
      return response.data
    },
  })
}

interface StreamOptions {
  profileType: string
  inputs?: ProfileInputsData
}

export const useComputeTax = () => {
  return useMutation({
    mutationFn: async ({ profileType, inputs }: { profileType: string; inputs?: ProfileInputsData }) => {
      const response = await apiClient.post<TaxComputationResponse>(
        '/profiles/compute-tax',
        { profile_type: profileType, inputs: inputs ?? null }
      )
      return response.data
    },
  })
}

export const useProfileAnalysisStream = () => {
  const [streamingAnswer, setStreamingAnswer] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [sources, setSources] = useState<Source[]>([])
  const [error, setError] = useState<string | null>(null)

  const startStream = async ({ profileType, inputs }: StreamOptions) => {
    setStreamingAnswer('')
    setSources([])
    setError(null)
    setIsStreaming(true)

    try {
      const headers = getApiHeaders()
      headers['Content-Type'] = 'application/json'

      const response = await fetch('/api/v1/profiles/analyze-stream', {
        method: 'POST',
        headers,
        body: JSON.stringify({ profile_type: profileType, inputs: inputs ?? null }),
      })

      if (!response.ok) {
        const text = await response.text()
        throw new Error(`HTTP ${response.status}: ${text}`)
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No readable stream')

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.chunk !== undefined) {
              setStreamingAnswer(prev => prev + data.chunk)
            }
            if (data.done) {
              setSources(data.sources ?? [])
              setIsStreaming(false)
            }
          } catch {
            // skip malformed SSE line
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Stream failed')
      setIsStreaming(false)
    }
  }

  const reset = () => {
    setStreamingAnswer('')
    setSources([])
    setError(null)
    setIsStreaming(false)
  }

  return { streamingAnswer, isStreaming, sources, error, startStream, reset }
}
