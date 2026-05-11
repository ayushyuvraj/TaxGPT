import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Source } from '../lib/types'

export interface GenNextChatMessage {
  question: string
  answer: string
  sources?: Source[]
  timestamp: number
}

interface ChatGenNextStore {
  history: GenNextChatMessage[]
  addMessage: (question: string, answer: string, sources?: Source[], usedDocument?: string) => void
  clearHistory: () => void
  getLastN: (n: number) => GenNextChatMessage[]
}

export const useChatGenNextStore = create<ChatGenNextStore>()(
  persist(
    (set, get) => ({
      history: [],

      addMessage: (question, answer, sources, usedDocument) => {
        set((state) => ({
          history: [
            ...state.history.slice(-99),
            { question, answer, sources, usedDocument, timestamp: Date.now() },
          ],
        }))
      },

      clearHistory: () => set({ history: [] }),

      getLastN: (n) => get().history.slice(-n),
    }),
    {
      name: 'taxgpt-gennext-history',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
