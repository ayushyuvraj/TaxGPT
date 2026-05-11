import { useMutation } from '@tanstack/react-query'
import apiClient from '../lib/api'
import type { NoticeResponse } from '../lib/types'

export const useNoticeDecode = () => {
  return useMutation({
    mutationFn: async (noticeText: string) => {
      const response = await apiClient.post<NoticeResponse>(
        '/notice/decode',
        { notice_text: noticeText }
      )
      return response.data
    },
  })
}
