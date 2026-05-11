import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../lib/api'
import type { IngestionStatusResponse } from '../lib/types'

export const useIngestionStart = () => {
  return useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/ingestion/start', {})
      return response.data
    },
  })
}

export const useIngestionStatus = (enabled = false) => {
  return useQuery({
    queryKey: ['ingestionStatus'],
    queryFn: async () => {
      const response = await apiClient.get<IngestionStatusResponse>(
        '/ingestion/status'
      )
      return response.data
    },
    enabled,
    refetchInterval: 2000, // Poll every 2 seconds
  })
}
