import { useState } from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, ExternalLink, CheckCircle2, Circle, Lock } from 'lucide-react'
import { CompareActsModal } from './CompareActsModal'
import { useProfileSnapshotStore } from '../store/profileSnapshotStore'
import type { SavingsOpportunity } from '../lib/types'

const fmt = (n: number) =>
  n >= 100_000
    ? `₹${(n / 100_000).toFixed(1)}L`
    : n > 0
    ? `₹${n.toLocaleString('en-IN')}`
    : '—'

const EFFORT_STYLES = {
  Zero:   'border-emerald-500/40 bg-emerald-500/10 text-emerald-300',
  Low:    'border-indigo-500/40  bg-indigo-500/10  text-indigo-300',
  Medium: 'border-amber-500/40   bg-amber-500/10   text-amber-300',
  High:   'border-red-500/40     bg-red-500/10     text-red-300',
}

interface SavingsRankerProps {
  opportunities: SavingsOpportunity[]
  snapshotId?: string   // if provided, enables action tracking
}

export function SavingsRanker({ opportunities, snapshotId }: SavingsRankerProps) {
  const [modalSection, setModalSection] = useState<string | null>(null)
  const store = useProfileSnapshotStore()

  const snap = snapshotId ? store.snapshots.find(s => s.id === snapshotId) : null
  const completedNames = snap?.completedActionNames ?? []

  const applicable   = opportunities.filter(o => o.applicable)
  const inapplicable = opportunities.filter(o => !o.applicable)

  // Running tally
  const capturedSaving = applicable
    .filter(o => completedNames.includes(o.name))
    .reduce((sum, o) => sum + o.potential_saving, 0)
  const totalActionsToTake = applicable.filter(o => o.effort !== 'Zero').length
  const doneCount = applicable.filter(o => o.effort !== 'Zero' && completedNames.includes(o.name)).length

  const handleToggle = (o: SavingsOpportunity) => {
    if (!snapshotId || o.effort === 'Zero') return
    store.toggleActionDone(snapshotId, o.name)
  }

  const renderRow = (o: SavingsOpportunity, i: number) => {
    const isDone = completedNames.includes(o.name)
    const isAuto = o.effort === 'Zero'
    const canToggle = !!snapshotId && !isAuto && o.applicable

    return (
      <motion.div
        key={o.name}
        initial={{ opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: i * 0.05 }}
        className={`flex items-center gap-3 rounded-xl border p-3 transition-all ${
          isDone && !isAuto
            ? 'border-emerald-500/25 bg-emerald-500/5'
            : o.applicable
            ? 'border-white/8 bg-white/3 hover:border-white/15 hover:bg-white/6'
            : 'border-white/4 bg-white/1 opacity-50'
        }`}
      >
        {/* Checkbox / rank */}
        <div className="shrink-0 flex h-8 w-8 items-center justify-center">
          {canToggle ? (
            <button
              onClick={() => handleToggle(o)}
              className="flex h-8 w-8 items-center justify-center rounded-lg transition-all hover:scale-110"
              title={isDone ? 'Mark as pending' : 'Mark as done'}
            >
              {isDone
                ? <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                : <Circle className="h-5 w-5 text-gray-600 hover:text-gray-400" />
              }
            </button>
          ) : isAuto && o.applicable ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            </div>
          ) : !snapshotId && o.applicable && o.effort !== 'Zero' ? (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5" title="Save analysis to track actions">
              <Lock className="h-3.5 w-3.5 text-gray-600" />
            </div>
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/5 text-xs font-bold text-gray-500">
              {o.applicable ? i + 1 : '–'}
            </div>
          )}
        </div>

        {/* Name + description */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`text-sm font-semibold leading-tight ${isDone && !isAuto ? 'line-through text-gray-500' : 'text-white'} truncate`}>
              {o.name}
            </span>
            <button
              onClick={() => setModalSection(o.section)}
              className="flex items-center gap-0.5 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-mono font-bold text-indigo-400 hover:border-indigo-500/60 hover:bg-indigo-500/20 transition-all shrink-0"
            >
              §{o.section}
              <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{o.description}</p>

          {/* Utilization bar */}
          {o.max_amount > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex-1 h-1 rounded-full bg-white/8 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500"
                  style={{ width: `${Math.min(100, (o.current_utilization / o.max_amount) * 100)}%` }}
                />
              </div>
              <span className="text-[10px] text-gray-600 shrink-0">
                {fmt(o.current_utilization)} / {fmt(o.max_amount)}
              </span>
            </div>
          )}
        </div>

        {/* Saving amount + effort */}
        <div className="shrink-0 text-right">
          {o.potential_saving > 0 ? (
            <p className={`text-sm font-black ${isDone && !isAuto ? 'text-emerald-500' : 'text-emerald-400'}`}>
              {fmt(o.potential_saving)}
            </p>
          ) : (
            <p className="text-xs text-gray-600">—</p>
          )}
          <span className={`mt-0.5 inline-block rounded-full border px-1.5 py-0.5 text-[10px] font-semibold ${EFFORT_STYLES[o.effort as keyof typeof EFFORT_STYLES] ?? EFFORT_STYLES.Low}`}>
            {o.effort}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1117]/70 p-5 space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-emerald-400" />
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Savings Opportunities</p>
            <p className="text-xs text-gray-600">Ranked by potential saving · Click §section to view Act</p>
          </div>
        </div>

        {/* Running tally — shown when snapshot active */}
        {snapshotId && totalActionsToTake > 0 && (
          <motion.div
            key={`${capturedSaving}-${doneCount}`}
            initial={{ scale: 1.05 }}
            animate={{ scale: 1 }}
            className="shrink-0 rounded-xl border border-emerald-500/25 bg-emerald-500/8 px-3 py-1.5 text-right"
          >
            <p className="text-xs font-black text-emerald-400 tabular-nums">{fmt(capturedSaving)}</p>
            <p className="text-[10px] text-gray-500">{doneCount}/{totalActionsToTake} done</p>
          </motion.div>
        )}
      </div>

      {/* Header row */}
      <div className="hidden md:grid grid-cols-[2rem_1fr_auto] gap-3 px-3 text-[10px] font-semibold text-gray-600 uppercase tracking-wider">
        <span>#</span>
        <span>Opportunity</span>
        <span className="text-right">Saving / Effort</span>
      </div>

      <div className="space-y-2">
        {applicable.map((o, i) => renderRow(o, i))}
      </div>

      {inapplicable.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wider px-1">Not applicable for your profile</p>
          {inapplicable.map((o, i) => renderRow(o, i))}
        </div>
      )}

      {!snapshotId && applicable.some(o => o.effort !== 'Zero') && (
        <p className="text-[10px] text-gray-600 text-center pt-1 flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" />
          Save this analysis to track which actions you've completed
        </p>
      )}

      {modalSection && (
        <CompareActsModal
          oldSection={modalSection}
          newSection={modalSection}
          onClose={() => setModalSection(null)}
        />
      )}
    </div>
  )
}
