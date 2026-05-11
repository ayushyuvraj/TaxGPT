import { useState } from 'react'
import { motion } from 'framer-motion'
import { Send, Loader, AlertCircle, CheckCircle2, AlertTriangle, Key } from 'lucide-react'
import { useNoticeDecode } from '../hooks/useNotice'
import { useApiKeyStore } from '../store/apiKeyStore'

const SEVERITY_CONFIG: Record<string, { color: string; icon: React.ComponentType<{ className?: string }>; label: string }> = {
  critical: { color: 'bg-red-500/10 border-red-500/20 text-red-400', icon: AlertTriangle, label: 'Critical' },
  high: { color: 'bg-orange-500/10 border-orange-500/20 text-orange-400', icon: AlertTriangle, label: 'High' },
  medium: { color: 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400', icon: AlertCircle, label: 'Medium' },
  low: { color: 'bg-blue-500/10 border-blue-500/20 text-blue-400', icon: CheckCircle2, label: 'Low' },
}

interface NoticeTabProps {
  onOpenSettings?: () => void
}

export function NoticeTab({ onOpenSettings }: NoticeTabProps) {
  const [noticeText, setNoticeText] = useState('')
  const { mutate, isPending, data: result, error } = useNoticeDecode()
  const { provider, geminiKey, anthropicKey, openaiKey, openrouterKey, ollamaUrl } = useApiKeyStore()

  const apiKey =
    provider === 'gemini' ? geminiKey :
    provider === 'anthropic' ? anthropicKey :
    provider === 'openai' ? openaiKey :
    provider === 'openrouter' ? openrouterKey :
    provider === 'ollama' ? ollamaUrl : ''

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!noticeText.trim() || !apiKey) return
    mutate(noticeText.trim())
  }

  if (!apiKey) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-96 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-2xl text-center p-8"
      >
        <AlertCircle className="h-12 w-12 text-amber-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">API Key Required</h3>
        <p className="text-gray-400 text-sm mb-6">
          Configure at least one AI provider to decode tax notices
        </p>
        {onOpenSettings && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings}
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
          >
            <Key className="h-4 w-4" />
            Configure Providers
          </motion.button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-white/8 bg-[#0d1117]/70 backdrop-blur-2xl p-6"
      >
        <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Paste Notice Text</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={noticeText}
            onChange={(e) => setNoticeText(e.target.value)}
            placeholder="Paste your tax notice, demand, or communication from the tax authority..."
            disabled={isPending}
            rows={6}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 disabled:opacity-50 resize-none"
          />

          <div className="flex items-center justify-between">
            <p className="text-xs text-gray-500">
              {noticeText.length} characters • Min 50 chars
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={noticeText.length < 50 || isPending}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              {isPending ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isPending ? 'Analyzing...' : 'Analyze Notice'}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Loading State */}
      {isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-80 rounded-2xl border border-white/8 bg-[#0d1117]/70 backdrop-blur-2xl"
        >
          <Loader className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
          <p className="text-gray-400">Decoding notice...</p>
        </motion.div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex gap-3"
        >
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Analysis Failed</p>
            <p className="text-xs mt-1">{error.message}</p>
          </div>
        </motion.div>
      )}

      {/* Result */}
      {result && !isPending && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Severity Badge */}
          {result.metadata?.severity && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`rounded-xl border p-4 flex gap-3 ${
                SEVERITY_CONFIG[result.metadata.severity]?.color || ''
              }`}
            >
              {(() => {
                const config = SEVERITY_CONFIG[result.metadata!.severity!]
                const Icon = config?.icon || AlertCircle
                return (
                  <>
                    <Icon className="h-5 w-5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-sm">
                        {config?.label || 'Unknown'} Severity
                      </p>
                      <p className="text-xs mt-1 opacity-90">
                        Review this notice carefully
                      </p>
                    </div>
                  </>
                )
              })()}
            </motion.div>
          )}

          {/* Analysis */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="rounded-2xl border border-indigo-500/20 bg-gradient-to-br from-indigo-500/10 to-violet-500/10 backdrop-blur-2xl p-6"
          >
            <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Analysis</h4>
            <p className="text-gray-200 whitespace-pre-wrap text-sm leading-relaxed">
              {result.analysis}
            </p>
          </motion.div>

          {/* Sections Detected */}
          {result.metadata?.sections && result.metadata.sections.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
              className="rounded-2xl border border-white/8 bg-white/5 backdrop-blur-xl p-6"
            >
              <h4 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
                Sections Referenced
              </h4>
              <div className="flex flex-wrap gap-2">
                {result.metadata.sections.map((section: string, idx: number) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 + idx * 0.05 }}
                    className="rounded-lg bg-indigo-500/20 border border-indigo-500/30 px-3 py-1.5 text-xs font-medium text-indigo-300"
                  >
                    Section {section}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}

      {!isPending && !result && !error && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-80 rounded-2xl border border-white/8 bg-[#0d1117]/70 backdrop-blur-2xl text-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 mb-4">
            <span className="text-3xl">📄</span>
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Decode Tax Notices</h3>
          <p className="text-gray-500 text-sm max-w-xs">
            Paste any tax notice, demand letter, or communication to get instant analysis with sections, severity, and recommended actions
          </p>
        </motion.div>
      )}
    </div>
  )
}
