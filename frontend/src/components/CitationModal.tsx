import { motion, AnimatePresence } from 'framer-motion'
import { X, BookOpen, Copy, Share2, ExternalLink, CheckCircle2 } from 'lucide-react'
import { useState } from 'react'
import type { Source } from '../lib/types'

interface CitationModalProps {
  citation: Source | null
  onClose: () => void
}

export function CitationModal({ citation, onClose }: CitationModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    const text = `${citation?.section ? `Section ${citation.section}` : citation?.source}\n\n${citation?.text || 'No text available'}`
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const sectionNumber = citation?.section || ''
  const sourceTitle = citation?.source
    .replace(/\s*›\s*Section[-\s]\d+[A-Z]*/i, '')
    .replace(/\s*›\s*Schedule[-\s]\d+[A-Z]*/i, '')
    .replace(/\.pdf$/i, '')
    .trim() || 'Tax Law Reference'

  return (
    <AnimatePresence>
      {citation && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[9999] bg-black/70 backdrop-blur-md"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
            onClick={onClose}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl max-h-[85vh] overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#0f1419] via-[#161b22] to-[#0d1117] shadow-2xl flex flex-col"
            >
              {/* Header with gradient */}
              <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-r from-indigo-600/20 to-violet-600/20 p-6">
                <div className="absolute inset-0 opacity-30">
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/0 via-indigo-500/10 to-indigo-500/0 blur-2xl" />
                </div>
                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ delay: 0.1 }}
                      className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/20 border border-indigo-500/30 shrink-0"
                    >
                      <BookOpen className="h-5 w-5 text-indigo-400" />
                    </motion.div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        {sectionNumber && (
                          <motion.span
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="text-2xl font-bold bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent"
                          >
                            § {sectionNumber}
                          </motion.span>
                        )}
                        <motion.span
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.05 }}
                          className="text-sm font-medium text-gray-300 break-words"
                        >
                          {sourceTitle}
                        </motion.span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={onClose}
                    className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </motion.button>
                </div>
              </div>

              {/* Content */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 }}
                className="flex-1 overflow-y-auto p-6 space-y-4"
              >
                {/* Source meta */}
                <div className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono text-gray-400">Source:</span>
                    <span className="font-mono text-indigo-300 truncate">{citation.source}</span>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/20 transition-colors text-xs font-medium"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-3.5 w-3.5" />
                        Copy
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Main content */}
                <div className="space-y-3">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Full Text</h4>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.15 }}
                    className="prose prose-invert max-w-none"
                  >
                    <div className="rounded-xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/10 p-5 text-sm leading-relaxed text-gray-200">
                      {citation.text ? (
                        <div className="whitespace-pre-wrap font-serif">
                          {citation.text}
                        </div>
                      ) : (
                        <div className="text-gray-500 italic">No detailed content available for this section.</div>
                      )}
                    </div>
                  </motion.div>
                </div>

                {/* Additional info */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="pt-4 border-t border-white/10"
                >
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>💡 This content is from the Income Tax Act 2025 and related rules.</p>
                    <p>⚖️ For official legal advice, consult a tax professional.</p>
                  </div>
                </motion.div>
              </motion.div>

              {/* Footer */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="flex items-center gap-2 border-t border-white/10 bg-white/5 px-6 py-4"
              >
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleCopy}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors"
                >
                  <Copy className="h-4 w-4" />
                  Copy Full Text
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-lg border border-white/10 hover:bg-white/10 text-gray-300 text-sm font-semibold transition-colors"
                >
                  Close
                </motion.button>
              </motion.div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
