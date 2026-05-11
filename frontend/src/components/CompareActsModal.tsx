import { motion } from 'framer-motion'
import { X, ArrowLeftRight, CheckCircle2 } from 'lucide-react'
import { useCompareFromOld } from '../hooks/useCompare'
import { TextPanel } from './CompareActsPanel'

interface CompareActsModalProps {
  oldSection: string
  newSection: string
  onClose: () => void
}

export function CompareActsModal({
  oldSection,
  newSection,
  onClose,
}: CompareActsModalProps) {
  const fromOld = useCompareFromOld(oldSection)
  const result = fromOld.data

  const displayOldSection = result?.old_section || oldSection
  const displayNewSection = result?.new_section || newSection

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[90vh] rounded-2xl border border-white/10 bg-gradient-to-b from-white/5 to-white/2 overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-white/8">
          <div>
            <h2 className="text-lg font-bold text-white">Parallel Reading Utility</h2>
            <p className="text-xs text-white/40 mt-0.5">
              Compare sections of Income Tax Act, 1961 and 2025 side by side
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col gap-6 p-6">
          {/* Mapping auto-match notice */}
          {result && result.new_section && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-green-500/20 bg-green-500/5"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-green-400 shrink-0" />
              <p className="text-xs text-green-400/80">
                Section <strong className="text-green-300">{result.old_section}</strong> of the 1961 Act corresponds to
                Section <strong className="text-green-300">{result.new_section}</strong> of the Income Tax Act, 2025
              </p>
            </motion.div>
          )}

          {/* Side-by-side text panels */}
          <div className="flex-1 grid grid-cols-2 gap-4 min-h-0">
            <TextPanel
              act="1961"
              section={displayOldSection}
              text={result?.old_text || null}
              found={result?.old_found || false}
              loading={fromOld.isLoading}
              accentColor="#f59e0b"
              title={result?.mapping?.title_old}
            />
            <TextPanel
              act="2025"
              section={displayNewSection}
              text={result?.new_text || null}
              found={result?.new_found || false}
              loading={fromOld.isLoading}
              accentColor="#6366f1"
              title={result?.mapping?.title_new}
            />
          </div>

          <p className="shrink-0 text-center text-[10px] text-white/20">
            Section text extracted from official PDFs. For authoritative reference, consult{' '}
            <span className="text-white/30">incometaxindia.gov.in</span>. Not legal advice.
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}
