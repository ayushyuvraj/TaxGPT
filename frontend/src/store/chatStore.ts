import { create } from 'zustand'
import type { Source } from '../lib/types'

interface ChatMessage {
  question: string
  answer: string
  sources?: Source[]
}

interface ChatStore {
  history: ChatMessage[]
  addMessage: (question: string, answer: string, sources?: Source[]) => void
  clearHistory: () => void
  getLastN: (n: number) => ChatMessage[]
}

export const useChatStore = create<ChatStore>((set, get) => ({
  history: [],

  addMessage: (question: string, answer: string, sources?: Source[]) => {
    set((state) => ({
      history: [...state.history.slice(-4), { question, answer, sources }],
    }))
  },

  clearHistory: () => set({ history: [] }),

  getLastN: (n: number) => {
    const { history } = get()
    return history.slice(-n)
  },
}))
