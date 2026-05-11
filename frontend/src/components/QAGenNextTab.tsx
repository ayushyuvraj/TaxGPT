import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Send, Loader, AlertCircle, Key, BookOpen, Database, X,
  Paperclip, FileText, Receipt, Plus, Trash2, Edit2, Menu,
} from 'lucide-react'
import { useQAGenNextStream } from '../hooks/useQAGenNext'
import { useDocumentUpload } from '../hooks/useDocument'
import { useHealth } from '../hooks/useHealth'
import { useConversationStore } from '../store/conversationStore'
import { useApiKeyStore } from '../store/apiKeyStore'
import { CompareActsModal } from './CompareActsModal'
import { AnswerWithCitations } from './AnswerWithCitations'
import { useCompareFromNew, useCompareFromOld } from '../hooks/useCompare'
import type { Source, ActiveDocument } from '../lib/types'

// ── Helpers ───────────────────────────────────────────────────────────────────
function is2025Source(source: Source): boolean {
  const h = (source.source ?? '').toLowerCase()
  return h.includes('2025') || h.includes('rules-2026') || h.includes('rules_2026') ||
         h.includes('faq') || h.includes('transition')
}

// ── SectionPopup: opens CompareActsModal, routing by Act ─────────────────────
function SectionPopup({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const section = source?.section ?? null
  const from2025 = source ? is2025Source(source) : false

  // Always call both hooks; only one is enabled at a time via the null guard
  const fromNew = useCompareFromNew(from2025 && section ? section : null)
  const fromOld = useCompareFromOld(!from2025 && section ? section : null)

  if (!source || !section) return null

  const isLoading = from2025 ? fromNew.isLoading : fromOld.isLoading

  const oldSection = from2025
    ? (fromNew.data?.old_section ?? section)
    : section
  const newSection = from2025
    ? section
    : (fromOld.data?.new_section ?? section)

  return (
    <AnimatePresence>
      {isLoading ? (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-6 py-4">
            <Loader className="h-5 w-5 text-indigo-400 animate-spin" />
            <span className="text-sm text-white">Loading section…</span>
          </div>
        </motion.div>
      ) : (
        <CompareActsModal key="modal" oldSection={oldSection} newSection={newSection} onClose={onClose} />
      )}
    </AnimatePresence>
  )
}

// ── SourcePills (local copy — QATab.tsx is not modified) ─────────────────────
function SourcePills({ sources }: { sources?: Source[] }) {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)

  if (!sources || sources.length === 0) return null

  const unique = Array.from(
    new Map(sources.map(s => [s.section || s.source, s])).values()
  )
  const sectioned = unique.filter(s => s.section)
  const filesOnly = unique.filter(s => !s.section)

  return (
    <div className="mt-3 pt-3 border-t border-white/8">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="h-3 w-3 text-gray-500" />
        <span className="text-xs text-gray-500 font-medium">Referenced sections</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sectioned.map((s, i) => {
          const actName = s.source
            .replace(/\s*›\s*Section[-\s]\d+[A-Z]*/i, '')
            .replace(/\s*›\s*Schedule[-\s]\d+[A-Z]*/i, '')
            .replace(/\.pdf$/i, '')
            .trim()
          return (
            <button key={i} onClick={() => setSelectedSource(s)}
              className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs bg-indigo-500/10 border border-indigo-500/25 text-indigo-200 hover:bg-indigo-500/20 transition-colors">
              <span className="font-mono font-semibold text-indigo-300">§{s.section}</span>
              {actName && (
                <span className="text-indigo-400/70 border-l border-indigo-500/25 pl-1.5">{actName}</span>
              )}
            </button>
          )
        })}
        {filesOnly.map((s, i) => (
          <span key={`f-${i}`}
            className="inline-flex items-center rounded-md px-2.5 py-1 text-xs bg-white/5 border border-white/10 text-gray-400">
            {s.source.replace(/\.pdf$/i, '').replace(/_/g, ' ')}
          </span>
        ))}
      </div>

      <SectionPopup source={selectedSource} onClose={() => setSelectedSource(null)} />
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface QAGenNextTabProps {
  onOpenSettings?: () => void
}

export function QAGenNextTab({ onOpenSettings }: QAGenNextTabProps) {
  const [question, setQuestion] = useState('')
  const [selectedCitation, setSelectedCitation] = useState<Source | null>(null)
  const [activeDoc, setActiveDoc] = useState<ActiveDocument | null>(null)
  const [isInvoice, setIsInvoice] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { streamQuery, streamingAnswer, isStreaming, streamError, streamSources } = useQAGenNextStream()
  const { mutate: uploadDoc, isPending: isUploading } = useDocumentUpload()
  const {
    conversations,
    currentConversationId,
    createConversation,
    switchConversation,
    renameConversation,
    deleteConversation,
    getCurrentConversation,
    addMessage,
    clearCurrentConversation,
  } = useConversationStore()
  const { provider, geminiKey, anthropicKey, openaiKey, openrouterKey, ollamaUrl } = useApiKeyStore()
  const { data: health } = useHealth()
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const currentConversation = getCurrentConversation()
  const chatHistory = currentConversation?.messages || []

  const indexEmpty = health !== undefined && health.vector_count === 0

  const apiKey =
    provider === 'gemini' ? geminiKey :
    provider === 'anthropic' ? anthropicKey :
    provider === 'openai' ? openaiKey :
    provider === 'openrouter' ? openrouterKey :
    provider === 'ollama' ? ollamaUrl : ''

  // Auto-create first conversation if none exists
  useEffect(() => {
    if (conversations.length === 0) {
      createConversation()
    } else if (!currentConversationId) {
      switchConversation(conversations[0].id)
    }
  }, [conversations.length, currentConversationId, createConversation, switchConversation])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, streamingAnswer])

  const MIN_CHARS = 10

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (question.trim().length < MIN_CHARS || !apiKey || isStreaming) return

    const lastN = chatHistory.slice(-3)
    streamQuery(
      {
        question: question.trim(),
        chat_history: lastN.map(({ question: q, answer: a }) => ({ question: q, answer: a })),
        language: 'en',
        doc_context: activeDoc?.extractedText,
        is_invoice: isInvoice,
      },
      activeDoc?.filename,
      addMessage
    )
    setQuestion('')
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError(null)

    uploadDoc(file, {
      onSuccess: (data) => {
        if (data.success && data.is_tax_related) {
          setActiveDoc({
            filename: data.filename,
            extractedText: data.extracted_text,
            truncated: data.truncated,
            isInvoice: data.is_invoice_likely,
            formatType: data.format_type,
          })
          setIsInvoice(data.is_invoice_likely)
        } else if (!data.is_tax_related && data.validation_message) {
          setUploadError(data.validation_message)
        } else {
          setUploadError(data.error ?? 'Could not extract text from file')
        }
      },
      onError: (err) => {
        setUploadError(err instanceof Error ? err.message : 'Upload failed')
      },
    })
    e.target.value = ''
  }

  if (!apiKey) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-96 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-2xl text-center p-8">
        <AlertCircle className="h-12 w-12 text-amber-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">API Key Required</h3>
        <p className="text-gray-400 text-sm mb-6">Configure at least one AI provider to use the assistant</p>
        {onOpenSettings && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
            onClick={onOpenSettings}
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all">
            <Key className="h-4 w-4" />
            Configure Providers
          </motion.button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="flex h-full w-full bg-[#0d1117]/70 backdrop-blur-2xl relative">
      {/* Conversation Sidebar */}
      <motion.div
        initial={false}
        animate={{ width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        className="border-r border-white/10 bg-[#0d1117]/50 overflow-hidden flex flex-col shrink-0"
      >
        <div className="p-4 border-b border-white/10">
          <motion.button
            whileHover={{ scale: 1.02 }}
            onClick={() => {
              createConversation()
              setSidebarOpen(false)
            }}
            className="w-full flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-500 transition-colors"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </motion.button>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {conversations.map((conv) => (
            <div key={conv.id} className="border-b border-white/5 last:border-b-0">
              <div
                className={`flex items-center gap-2 px-3 py-2.5 cursor-pointer transition-colors group ${
                  currentConversationId === conv.id
                    ? 'bg-indigo-500/15 text-indigo-200'
                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-300'
                }`}
                onClick={() => {
                  switchConversation(conv.id)
                  setSidebarOpen(false)
                }}
              >
                <div className="flex-1 min-w-0">
                  {renamingId === conv.id ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value)}
                      onBlur={() => {
                        if (renameValue.trim()) {
                          renameConversation(conv.id, renameValue)
                        }
                        setRenamingId(null)
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && renameValue.trim()) {
                          renameConversation(conv.id, renameValue)
                          setRenamingId(null)
                        } else if (e.key === 'Escape') {
                          setRenamingId(null)
                        }
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full text-xs bg-white/10 border border-indigo-500/30 rounded px-2 py-1 text-indigo-200 focus:outline-none"
                    />
                  ) : (
                    <div className="text-xs truncate">{conv.title}</div>
                  )}
                </div>

                {/* Hover actions */}
                {currentConversationId === conv.id && !renamingId && (
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setRenamingId(conv.id)
                        setRenameValue(conv.title)
                      }}
                      className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 transition-colors"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteConversation(conv.id)
                      }}
                      className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 h-full overflow-hidden">
        {/* Header with sidebar toggle button */}
        <div className="flex items-center justify-center gap-3 px-5 py-3 border-b border-indigo-500/20 bg-indigo-500/5">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-1 rounded-lg hover:bg-white/10 text-gray-400 hover:text-gray-300 transition-colors shrink-0"
            title={sidebarOpen ? "Hide conversations" : "Show conversations"}
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 flex-1 text-center">
            GenNext · Grounded · Streaming · Doc Analysis
          </span>
          <div className="w-6 shrink-0" />
        </div>

        {indexEmpty && (
          <div className="flex items-start gap-3 px-5 py-3 bg-amber-500/10 border-b border-amber-500/20">
            <Database className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-300 leading-relaxed">
              <span className="font-semibold">Knowledge base is empty.</span> Go to Dashboard → Ingest to build the index.
            </p>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
        <AnimatePresence>
          {chatHistory.length === 0 && !isStreaming ? (
            <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center h-full text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 mb-4">
                <span className="text-3xl">🧠</span>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Ask TaxGPT GenNext</h3>
              <p className="text-gray-500 text-sm max-w-xs mb-4">
                Zero-hallucination answers grounded in the Income Tax Act 2025. Attach a document or invoice for personalised analysis.
              </p>
              <div className="flex gap-2 flex-wrap justify-center">
                {['What is Tax Year under the new Act?', 'Section 80C equivalent in 2025?', 'New TDS consolidated section?'].map(q => (
                  <button key={q} onClick={() => setQuestion(q)}
                    className="text-xs px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/5 text-indigo-300 hover:bg-indigo-500/15 transition-colors">
                    {q}
                  </button>
                ))}
              </div>
            </motion.div>
          ) : (
            chatHistory.map((msg, idx) => (
              <motion.div key={idx} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }} className="space-y-3">
                <div className="flex justify-end">
                  <div className="max-w-xs lg:max-w-md bg-indigo-600 text-white rounded-2xl rounded-tr-sm p-4 shadow-lg">
                    <p className="text-sm">{msg.question}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-xs lg:max-w-2xl bg-white/8 border border-white/10 text-gray-100 rounded-2xl rounded-tl-sm p-4">
                    {msg.usedDocument && (
                      <div className="flex items-center gap-2 mb-3 pb-3 border-b border-white/10">
                        <FileText className="h-3 w-3 text-indigo-400" />
                        <span className="text-xs text-indigo-300 font-medium truncate">
                          Based on: {msg.usedDocument}
                        </span>
                      </div>
                    )}
                    <AnswerWithCitations
                      answer={msg.answer}
                      sources={msg.sources}
                      onCitationClick={setSelectedCitation}
                    />
                    <SourcePills sources={msg.sources} />
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </AnimatePresence>

        {/* Live streaming bubble */}
        {isStreaming && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
            {streamingAnswer === '' ? (
              <div className="flex gap-2 items-center text-gray-400">
                <Loader className="h-4 w-4 animate-spin" />
                <span className="text-sm">Thinking…</span>
              </div>
            ) : (
              <div className="flex justify-start">
                <div className="max-w-xs lg:max-w-2xl bg-white/8 border border-indigo-500/20 text-gray-100 rounded-2xl rounded-tl-sm p-4">
                  <AnswerWithCitations
                    answer={streamingAnswer}
                    sources={streamSources}
                    onCitationClick={setSelectedCitation}
                  />
                  <span className="inline-block h-4 w-0.5 bg-indigo-400 animate-pulse ml-0.5 align-text-bottom" />
                </div>
              </div>
            )}
          </motion.div>
        )}

        {streamError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-lg p-3 text-sm">
            Error: {streamError}
          </motion.div>
        )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input area */}
        <div className="border-t border-white/8 bg-[#0d1117]/50 px-6 py-4">
          {/* Upload error */}
          {uploadError && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-2 text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {uploadError}
              <button onClick={() => setUploadError(null)} className="ml-auto"><X className="h-3 w-3" /></button>
            </motion.div>
          )}

          {/* Active document badge */}
          {activeDoc && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center gap-2 mb-2 flex-wrap">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/20">
                {activeDoc.isInvoice
                  ? <Receipt className="h-3 w-3 text-amber-400 shrink-0" />
                  : <FileText className="h-3 w-3 text-indigo-400 shrink-0" />}
                <span className="text-xs text-indigo-300 font-medium truncate max-w-[180px]">
                  {activeDoc.filename}
                </span>
                {activeDoc.truncated && (
                  <span className="text-[10px] text-amber-400">(truncated)</span>
                )}
                <button onClick={() => { setActiveDoc(null); setIsInvoice(false) }}
                  className="text-gray-500 hover:text-gray-300 transition-colors">
                  <X className="h-3 w-3" />
                </button>
              </div>

              {/* Invoice mode toggle */}
              <button
                onClick={() => setIsInvoice(!isInvoice)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[10px] font-semibold uppercase tracking-wide transition-all ${
                  isInvoice
                    ? 'bg-amber-500/15 border-amber-500/30 text-amber-300'
                    : 'bg-white/5 border-white/10 text-gray-500 hover:text-gray-300'
                }`}
              >
                <Receipt className="h-3 w-3" />
                Invoice mode {isInvoice ? 'ON' : 'OFF'}
              </button>
            </motion.div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handleFileSelect}
            />

            <div className="flex-1 relative">
              <input
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={activeDoc ? `Ask about ${activeDoc.filename}…` : 'Ask about sections, deductions, forms…'}
                disabled={isStreaming}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-600 text-sm focus:outline-none focus:border-indigo-500/50 disabled:opacity-50"
              />
              {question.length > 0 && question.length < MIN_CHARS && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-amber-400">
                  {MIN_CHARS - question.length} more chars
                </span>
              )}
            </div>

            {/* Attach button */}
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading || isStreaming}
              title="Attach a PDF, JPG, PNG, or WEBP document"
              className={`flex items-center justify-center rounded-xl px-3 py-3 border transition-all disabled:opacity-50 ${
                activeDoc
                  ? 'border-indigo-500/40 bg-indigo-500/15 text-indigo-300'
                  : 'border-white/10 bg-white/5 text-gray-400 hover:bg-white/10 hover:text-gray-200'
              }`}
            >
              {isUploading
                ? <Loader className="h-4 w-4 animate-spin" />
                : <Paperclip className="h-4 w-4" />}
            </motion.button>

            {/* Send button */}
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              type="submit"
              disabled={question.trim().length < MIN_CHARS || isStreaming}
              className="flex items-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
            >
              {isStreaming ? <Loader className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {isStreaming ? 'Streaming' : 'Send'}
            </motion.button>
          </form>

          {chatHistory.length > 0 && !isStreaming && (
            <motion.button whileHover={{ scale: 1.02 }} onClick={clearCurrentConversation}
              className="mt-3 w-full text-xs text-gray-500 hover:text-gray-300 transition-colors">
              Clear conversation
            </motion.button>
          )}
        </div>

        <SectionPopup source={selectedCitation} onClose={() => setSelectedCitation(null)} />
      </div>
    </div>
  )
}
