import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, Upload, Briefcase, TrendingUp, Globe, Laptop, User, CheckCircle2 } from 'lucide-react'
import { useProfileSnapshotStore } from '../store/profileSnapshotStore'
import { TaxHealthScoreMini } from './TaxHealthScore'
import type { ProfileSnapshot } from '../lib/types'

const PROFILE_ICONS: Record<string, React.ElementType> = {
  salaried:   User,
  business:   Briefcase,
  investor:   TrendingUp,
  nri:        Globe,
  freelancer: Laptop,
}

const PROFILE_COLORS: Record<string, string> = {
  salaried:   'text-blue-400 bg-blue-500/15 border-blue-500/30',
  business:   'text-violet-400 bg-violet-500/15 border-violet-500/30',
  investor:   'text-emerald-400 bg-emerald-500/15 border-emerald-500/30',
  nri:        'text-amber-400 bg-amber-500/15 border-amber-500/30',
  freelancer: 'text-pink-400 bg-pink-500/15 border-pink-500/30',
}

function relativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins  < 1)   return 'just now'
  if (mins  < 60)  return `${mins}m ago`
  if (hours < 24)  return `${hours}h ago`
  if (days  < 30)  return `${days}d ago`
  return new Date(isoDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
}

function fmt(n: number): string {
  return n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`
}

interface SnapshotCardProps {
  snap: ProfileSnapshot
  onLoad: () => void
}

function SnapshotCard({ snap, onLoad }: SnapshotCardProps) {
  const store = useProfileSnapshotStore()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(snap.name)
  const inputRef = useRef<HTMLInputElement>(null)
  const Icon = PROFILE_ICONS[snap.profileType] ?? User
  const colorCls = PROFILE_COLORS[snap.profileType] ?? PROFILE_COLORS.salaried
  const isActive = store.activeSnapshotId === snap.id

  const handleRename = () => {
    const trimmed = editName.trim()
    if (trimmed && trimmed !== snap.name) store.renameSnapshot(snap.id, trimmed)
    setEditing(false)
  }

  const handleDelete = () => {
    if (confirmDelete) {
      store.deleteSnapshot(snap.id)
    } else {
      setConfirmDelete(true)
      setTimeout(() => setConfirmDelete(false), 3000)
    }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: 40 }}
      className={`rounded-xl border p-3 space-y-2.5 transition-all ${
        isActive
          ? 'border-indigo-500/40 bg-indigo-500/8'
          : 'border-white/8 bg-white/3 hover:border-white/15'
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${colorCls}`}>
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="flex-1 min-w-0">
          {editing ? (
            <input
              ref={inputRef}
              value={editName}
              onChange={e => setEditName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={e => { if (e.key === 'Enter') handleRename(); if (e.key === 'Escape') setEditing(false) }}
              className="w-full bg-white/8 rounded px-1.5 py-0.5 text-xs text-white border border-white/20 outline-none"
              autoFocus
            />
          ) : (
            <p
              className="text-xs font-semibold text-white leading-tight cursor-pointer hover:text-indigo-300 transition-colors truncate"
              onDoubleClick={() => { setEditing(true); setEditName(snap.name) }}
              title="Double-click to rename"
            >
              {snap.name}
            </p>
          )}
          <p className="text-[10px] text-gray-600 mt-0.5">{relativeTime(snap.createdAt)}</p>
        </div>
        <button
          onClick={handleDelete}
          className={`shrink-0 rounded-lg p-1 transition-all ${
            confirmDelete
              ? 'bg-red-500/20 text-red-400 border border-red-500/40'
              : 'text-gray-600 hover:text-red-400 hover:bg-red-500/10'
          }`}
          title={confirmDelete ? 'Click again to confirm delete' : 'Delete'}
        >
          <Trash2 className="h-3 w-3" />
        </button>
      </div>

      {/* Score + tax info */}
      <div className="flex items-center justify-between gap-2">
        <TaxHealthScoreMini breakdown={snap.taxHealthBreakdown} />
        <div className="text-right">
          <p className="text-xs font-black text-white tabular-nums">
            {fmt(snap.taxData.new_regime.total_tax)}
          </p>
          <p className="text-[10px] text-gray-600">
            {snap.taxData.winner === 'new' ? 'New' : 'Old'} regime wins
          </p>
        </div>
      </div>

      {/* Actions completed tally */}
      {snap.completedActionNames.length > 0 && (
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <CheckCircle2 className="h-3 w-3" />
          <span>{snap.completedActionNames.length} action{snap.completedActionNames.length > 1 ? 's' : ''} done</span>
        </div>
      )}

      {/* Load button */}
      <button
        onClick={onLoad}
        disabled={isActive}
        className={`w-full rounded-lg border py-1.5 text-xs font-semibold transition-all ${
          isActive
            ? 'border-indigo-500/30 bg-indigo-500/15 text-indigo-400 cursor-default'
            : 'border-white/10 bg-white/5 text-gray-300 hover:border-indigo-500/40 hover:bg-indigo-500/10 hover:text-indigo-300'
        }`}
      >
        {isActive ? '✓ Currently Loaded' : 'Load Analysis'}
      </button>
    </motion.div>
  )
}

interface SavedProfilesPanelProps {
  isOpen: boolean
  onClose: () => void
  onLoadSnapshot: (id: string) => void
  onSaveCurrent: () => void
  hasDraft: boolean
}

export function SavedProfilesPanel({
  isOpen,
  onClose,
  onLoadSnapshot,
  onSaveCurrent,
  hasDraft,
}: SavedProfilesPanelProps) {
  const store = useProfileSnapshotStore()
  const { snapshots } = store

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 z-50 h-full w-80 border-l border-white/10 bg-[#0a0d12]/95 backdrop-blur-xl flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
              <div>
                <p className="text-sm font-bold text-white">Saved Analyses</p>
                <p className="text-[10px] text-gray-500">
                  {snapshots.length}/10 snapshots · localStorage
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-gray-500 hover:text-white hover:bg-white/8 transition-all"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Save current button */}
            {hasDraft && (
              <div className="border-b border-white/8 px-4 py-3">
                <motion.button
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => { onSaveCurrent(); }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all"
                >
                  <Upload className="h-4 w-4" />
                  Save Current Analysis
                </motion.button>
                {snapshots.length >= 10 && (
                  <p className="text-[10px] text-amber-400 mt-1.5 text-center">
                    At capacity — saving will remove the oldest
                  </p>
                )}
              </div>
            )}

            {/* Snapshots list */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {snapshots.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full gap-3 text-center py-12">
                  <div className="h-12 w-12 rounded-2xl bg-white/5 flex items-center justify-center">
                    <Upload className="h-6 w-6 text-gray-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-gray-400">No saved analyses yet</p>
                    <p className="text-xs text-gray-600 mt-1">Run an analysis and click "Save" to keep it</p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {snapshots.map(snap => (
                    <SnapshotCard
                      key={snap.id}
                      snap={snap}
                      onLoad={() => { onLoadSnapshot(snap.id); onClose(); }}
                    />
                  ))}
                </AnimatePresence>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
