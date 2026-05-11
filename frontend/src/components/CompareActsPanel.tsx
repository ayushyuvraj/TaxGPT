import { motion, AnimatePresence } from 'framer-motion'
import { BookOpen, AlertCircle } from 'lucide-react'

export interface TextPanelProps {
  act: '1961' | '2025'
  section: string | null
  text: string | null
  found: boolean
  loading: boolean
  accentColor: string
  title?: string
}

export function TextPanel({
  act,
  section,
  text,
  found,
  loading,
  accentColor,
  title,
}: TextPanelProps) {
  const isEmpty = !section

  return (
    <div
      className="flex flex-col h-full rounded-2xl overflow-hidden border"
      style={{
        background: 'rgba(255,255,255,0.02)',
        borderColor: section ? `${accentColor}30` : 'rgba(255,255,255,0.06)',
        boxShadow: section ? `0 0 40px ${accentColor}08, inset 0 1px 0 rgba(255,255,255,0.04)` : 'none',
      }}
    >
      {/* Panel header */}
      <div
        className="px-5 py-4 border-b flex items-center gap-3"
        style={{
          borderColor: 'rgba(255,255,255,0.06)',
          background: `linear-gradient(135deg, ${accentColor}12 0%, transparent 100%)`,
        }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
          style={{ background: `${accentColor}20` }}
        >
          <BookOpen className="h-4 w-4" style={{ color: accentColor }} />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: accentColor }}>
            Income Tax Act, {act}
          </p>
          {section && (
            <p className="text-sm font-bold text-white truncate mt-0.5">
              Section {section}
              {title && <span className="font-normal text-white/50 ml-1">— {title}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-5">
        <AnimatePresence mode="wait">
          {isEmpty ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4 py-16"
            >
              <div
                className="h-16 w-16 rounded-2xl flex items-center justify-center"
                style={{ background: `${accentColor}10` }}
              >
                <BookOpen className="h-7 w-7" style={{ color: `${accentColor}60` }} />
              </div>
              <p className="text-sm text-white/30 text-center max-w-[200px]">
                Select a section from the dropdown above to view its provisions
              </p>
            </motion.div>
          ) : loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center h-full gap-4 py-16"
            >
              <motion.div
                className="h-8 w-8 rounded-full border-2"
                style={{ borderColor: `${accentColor}40`, borderTopColor: accentColor }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
              />
              <p className="text-xs text-white/30">Extracting section text...</p>
            </motion.div>
          ) : !found ? (
            <motion.div
              key="notfound"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center gap-3 py-12"
            >
              <AlertCircle className="h-8 w-8" style={{ color: `${accentColor}60` }} />
              <p className="text-sm text-white/40 text-center">
                Section {section} text not available in this dataset
              </p>
            </motion.div>
          ) : (
            <motion.div
              key={`text-${section}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div
                className="text-sm leading-relaxed whitespace-pre-wrap font-mono text-white/80 selection:bg-indigo-500/30"
                style={{ fontSize: '13px', lineHeight: '1.8' }}
              >
                {text}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
