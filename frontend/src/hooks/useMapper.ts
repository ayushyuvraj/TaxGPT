import { useMutation, useQuery } from '@tanstack/react-query'
import apiClient from '../lib/api'
import type { AllMappingsResponse, MapperResponse, MapperStatsResponse, MappingEntry } from '../lib/types'

export const useMapperLookup = () => {
  return useMutation({
    mutationFn: async (section: string) => {
      const response = await apiClient.post<MapperResponse>(
        '/mapper/lookup',
        { section }
      )
      return response.data
    },
  })
}

export const useMapperStats = () => {
  return useQuery({
    queryKey: ['mapperStats'],
    queryFn: async () => {
      const response = await apiClient.get<MapperStatsResponse>('/mapper/stats')
      return response.data
    },
  })
}

// Fetched once per session, cached forever — all lookups happen client-side after this
export const useMappingAll = () => {
  return useQuery({
    queryKey: ['mappingAll'],
    queryFn: async () => {
      const response = await apiClient.get<AllMappingsResponse>('/mapper/all')
      return response.data
    },
    staleTime: Infinity,
    select: (data): MappingEntry[] => {
      const entries: MappingEntry[] = []

      Object.entries(data.old_to_new).forEach(([key, val]) => {
        entries.push({
          key,
          found: true,
          type: 'section',
          old_section: key,
          new_section: val.new_section ?? '',
          title_old: val.title_old ?? '',
          title_new: val.title_new ?? '',
          change_summary: val.change_summary ?? '',
          category: val.category ?? '',
        })
      })

      Object.entries(data.concepts).forEach(([key, val]) => {
        entries.push({
          key,
          found: true,
          type: 'concept',
          old_concept: val.old_concept ?? key,
          new_concept: val.new_concept ?? '',
          new_section: val.new_section ?? '',
          change_summary: val.change_summary ?? '',
          impact: val.impact ?? '',
        })
      })

      Object.entries(data.forms).forEach(([key, val]) => {
        entries.push({
          key,
          found: true,
          type: 'form',
          old_form: val.old_form ?? key,
          new_form: val.new_form ?? '',
          purpose: val.purpose ?? '',
          status: val.status ?? '',
        })
      })

      return entries
    },
  })
}
