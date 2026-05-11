import axios from 'axios'
import { useApiKeyStore } from '../store/apiKeyStore'

const API_BASE_URL = '/api/v1'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
})

// Interceptor to add API key headers
apiClient.interceptors.request.use((config) => {
  const store = useApiKeyStore.getState()

  if (store.provider) {
    config.headers['X-Provider'] = store.provider
  }

  // Add provider-specific API key
  if (store.provider === 'gemini' && store.geminiKey) {
    config.headers['X-Gemini-Key'] = store.geminiKey
  } else if (store.provider === 'anthropic' && store.anthropicKey) {
    config.headers['X-Anthropic-Key'] = store.anthropicKey
  } else if (store.provider === 'openai' && store.openaiKey) {
    config.headers['X-OpenAI-Key'] = store.openaiKey
  } else if (store.provider === 'openrouter' && store.openrouterKey) {
    config.headers['X-OpenRouter-Key'] = store.openrouterKey
    if (store.openrouterModel) {
      config.headers['X-OpenRouter-Model'] = store.openrouterModel
    }
  } else if (store.provider === 'ollama') {
    if (store.ollamaUrl) {
      config.headers['X-Ollama-URL'] = store.ollamaUrl
    }
    if (store.ollamaModel) {
      config.headers['X-Ollama-Model'] = store.ollamaModel
    }
    if (store.ollamaKey) {
      config.headers['X-Ollama-Key'] = store.ollamaKey
    }
  }

  return config
})

// Error handler
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    if (status === 422) {
      // FastAPI validation error — extract the first human-readable message
      const detail = error.response.data?.detail
      let msg = 'Invalid request'
      if (Array.isArray(detail) && detail.length > 0) {
        msg = detail[0].msg ?? msg
      } else if (typeof detail === 'string') {
        msg = detail
      }
      return Promise.reject(new Error(msg))
    }
    return Promise.reject(error)
  }
)

/** Build provider API key headers for use with native fetch (streaming, uploads) */
export function getApiHeaders(): Record<string, string> {
  const store = useApiKeyStore.getState()
  const headers: Record<string, string> = {}

  if (store.provider) headers['X-Provider'] = store.provider

  if (store.provider === 'gemini' && store.geminiKey) {
    headers['X-Gemini-Key'] = store.geminiKey
  } else if (store.provider === 'anthropic' && store.anthropicKey) {
    headers['X-Anthropic-Key'] = store.anthropicKey
  } else if (store.provider === 'openai' && store.openaiKey) {
    headers['X-OpenAI-Key'] = store.openaiKey
  } else if (store.provider === 'openrouter' && store.openrouterKey) {
    headers['X-OpenRouter-Key'] = store.openrouterKey
    if (store.openrouterModel) headers['X-OpenRouter-Model'] = store.openrouterModel
  } else if (store.provider === 'ollama') {
    if (store.ollamaUrl) headers['X-Ollama-URL'] = store.ollamaUrl
    if (store.ollamaModel) headers['X-Ollama-Model'] = store.ollamaModel
    if (store.ollamaKey) headers['X-Ollama-Key'] = store.ollamaKey
  }

  return headers
}

export default apiClient
