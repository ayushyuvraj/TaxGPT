import { useQuery } from '@tanstack/react-query'
import apiClient from '../lib/api'

export interface SectionListItem {
  section: string
  label: string
}

export interface SectionsListResponse {
  act: string
  sections: SectionListItem[]
}

export interface CompareResponse {
  old_section: string
  new_section: string | null
  old_text: string | null
  new_text: string | null
  old_found: boolean
  new_found: boolean
  mapping: {
    new_section?: string
    title_old?: string
    title_new?: string
    change_summary?: string
    category?: string
  } | null
  error: string | null
}

export const useSectionsList = (act: '1961' | '2025') => {
  return useQuery({
    queryKey: ['sectionsList', act],
    queryFn: async () => {
      const res = await apiClient.get<SectionsListResponse>(`/compare/sections/${act}`)
      return res.data
    },
    staleTime: Infinity, // section lists never change
  })
}

export const useCompareFromOld = (oldSection: string | null) => {
  return useQuery({
    queryKey: ['compare', 'old', oldSection],
    queryFn: async () => {
      const res = await apiClient.get<CompareResponse>(`/compare/${oldSection}`)
      return res.data
    },
    enabled: !!oldSection,
    staleTime: Infinity,
  })
}

export const useCompareFromNew = (newSection: string | null) => {
  return useQuery({
    queryKey: ['compare', 'new', newSection],
    queryFn: async () => {
      const res = await apiClient.get<CompareResponse>(`/compare/reverse/${newSection}`)
      return res.data
    },
    enabled: !!newSection,
    staleTime: Infinity,
  })
}
