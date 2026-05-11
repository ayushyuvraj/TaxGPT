import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export type Provider = 'gemini' | 'anthropic' | 'openai' | 'openrouter' | 'ollama'

interface ApiKeyStore {
  provider: Provider
  geminiKey: string
  anthropicKey: string
  openaiKey: string
  openrouterKey: string
  openrouterModel: string
  ollamaUrl: string
  ollamaModel: string
  ollamaKey: string
  isInitialized: boolean

  // Actions
  setProvider: (provider: Provider) => void
  setGeminiKey: (key: string) => void
  setAnthropicKey: (key: string) => void
  setOpenAIKey: (key: string) => void
  setOpenRouterKey: (key: string) => void
  setOpenRouterModel: (model: string) => void
  setOllamaUrl: (url: string) => void
  setOllamaModel: (model: string) => void
  setOllamaKey: (key: string) => void
  loadFromBackend: () => Promise<void>
}

export const useApiKeyStore = create<ApiKeyStore>()(
  persist(
    (set) => ({
      provider: 'gemini',
      geminiKey: '',
      anthropicKey: '',
      openaiKey: '',
      openrouterKey: '',
      openrouterModel: 'openai/gpt-4',
      ollamaUrl: 'http://localhost:11434',
      ollamaModel: 'mistral',
      ollamaKey: '',
      isInitialized: false,

      setProvider: (provider) => set({ provider }),
      setGeminiKey: (geminiKey) => set({ geminiKey }),
      setAnthropicKey: (anthropicKey) => set({ anthropicKey }),
      setOpenAIKey: (openaiKey) => set({ openaiKey }),
      setOpenRouterKey: (openrouterKey) => set({ openrouterKey }),
      setOpenRouterModel: (openrouterModel) => set({ openrouterModel }),
      setOllamaUrl: (ollamaUrl) => set({ ollamaUrl }),
      setOllamaModel: (ollamaModel) => set({ ollamaModel }),
      setOllamaKey: (ollamaKey) => set({ ollamaKey }),

      loadFromBackend: async () => {
        try {
          const response = await fetch('/api/v1/config')
          const config = await response.json()

          if (config.gemini_key) set({ geminiKey: config.gemini_key })
          if (config.openai_key) set({ openaiKey: config.openai_key })
          if (config.anthropic_key) set({ anthropicKey: config.anthropic_key })
          if (config.openrouter_key) set({ openrouterKey: config.openrouter_key })
          if (config.ollama_url) set({ ollamaUrl: config.ollama_url })
          if (config.llm_provider) set({ provider: config.llm_provider as Provider })

          set({ isInitialized: true })
        } catch (error) {
          console.error('Failed to load API keys from backend:', error)
          set({ isInitialized: true })
        }
      },
    }),
    {
      name: 'api-key-store',
      storage: createJSONStorage(() => localStorage),
    }
  )
)
