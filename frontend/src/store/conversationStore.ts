import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { Source } from '../lib/types'

export interface ConversationMessage {
  question: string
  answer: string
  sources?: Source[]
  usedDocument?: string
  timestamp: number
}

export interface Conversation {
  id: string
  title: string
  messages: ConversationMessage[]
  createdAt: number
  updatedAt: number
}

interface ConversationStore {
  conversations: Conversation[]
  currentConversationId: string | null

  // Conversation management
  createConversation: (title?: string) => string
  switchConversation: (id: string) => void
  renameConversation: (id: string, title: string) => void
  deleteConversation: (id: string) => void
  getCurrentConversation: () => Conversation | null

  // Message management
  addMessage: (question: string, answer: string, sources?: Source[], usedDocument?: string) => void
  clearCurrentConversation: () => void
}

// Generate a simple title from the first question
function generateTitle(question: string): string {
  const words = question.split(' ').slice(0, 4).join(' ')
  return words.length > 30 ? words.substring(0, 30) + '…' : words || 'New conversation'
}

// Generate a simple UUID
function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export const useConversationStore = create<ConversationStore>()(
  persist(
    (set, get) => ({
      conversations: [],
      currentConversationId: null,

      createConversation: (title?: string) => {
        const id = generateId()
        const newConversation: Conversation = {
          id,
          title: title || 'New conversation',
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }
        set((state) => ({
          conversations: [newConversation, ...state.conversations],
          currentConversationId: id,
        }))
        return id
      },

      switchConversation: (id: string) => {
        const conv = get().conversations.find((c) => c.id === id)
        if (conv) {
          set({ currentConversationId: id })
        }
      },

      renameConversation: (id: string, title: string) => {
        set((state) => ({
          conversations: state.conversations.map((c) =>
            c.id === id ? { ...c, title, updatedAt: Date.now() } : c
          ),
        }))
      },

      deleteConversation: (id: string) => {
        set((state) => {
          const remaining = state.conversations.filter((c) => c.id !== id)
          return {
            conversations: remaining,
            currentConversationId:
              state.currentConversationId === id
                ? remaining[0]?.id || null
                : state.currentConversationId,
          }
        })
      },

      getCurrentConversation: () => {
        const state = get()
        return state.conversations.find((c) => c.id === state.currentConversationId) || null
      },

      addMessage: (question, answer, sources, usedDocument) => {
        set((state) => {
          let convId = state.currentConversationId
          if (!convId) {
            // Auto-create conversation if none exists
            convId = generateId()
            const newConv: Conversation = {
              id: convId,
              title: generateTitle(question),
              messages: [{ question, answer, sources, usedDocument, timestamp: Date.now() }],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            }
            return {
              conversations: [newConv, ...state.conversations],
              currentConversationId: convId,
            }
          }

          // Update existing conversation
          return {
            conversations: state.conversations.map((c) => {
              if (c.id === convId) {
                const isFirstMessage = c.messages.length === 0
                return {
                  ...c,
                  messages: [...c.messages, { question, answer, sources, usedDocument, timestamp: Date.now() }],
                  title: isFirstMessage ? generateTitle(question) : c.title,
                  updatedAt: Date.now(),
                }
              }
              return c
            }),
          }
        })
      },

      clearCurrentConversation: () => {
        set((state) => {
          const convId = state.currentConversationId
          if (convId) {
            return {
              conversations: state.conversations.map((c) =>
                c.id === convId ? { ...c, messages: [], updatedAt: Date.now() } : c
              ),
            }
          }
          return state
        })
      },
    }),
    {
      name: 'taxgpt-conversations',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
