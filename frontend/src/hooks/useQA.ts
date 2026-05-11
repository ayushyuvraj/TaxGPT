import { useMutation } from '@tanstack/react-query'
import apiClient from '../lib/api'
import { useChatStore } from '../store/chatStore'
import type { QAResponse, ChatMessage } from '../lib/types'

export interface QARequest {
  question: string
  chat_history: ChatMessage[]
  language: string
}

export const useQA = () => {
  const addMessage = useChatStore((state) => state.addMessage)

  return useMutation({
    mutationFn: async (request: QARequest) => {
      const response = await apiClient.post<QAResponse>(
        '/qa/answer',
        request
      )
      if (response.data.error) {
        throw new Error(response.data.answer || 'Failed to get response from AI')
      }
      return response.data
    },
    onSuccess: (data, request) => {
      addMessage(request.question, data.answer, data.sources)
    },
  })
}
