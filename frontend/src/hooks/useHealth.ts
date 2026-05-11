import { useQuery } from '@tanstack/react-query'
import apiClient from '../lib/api'
import type { HealthResponse } from '../lib/types'

export const useHealth = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const response = await apiClient.get<HealthResponse>('/health')
      return response.data
    },
    refetchInterval: 10000, // Check health every 10 seconds
  })
}
