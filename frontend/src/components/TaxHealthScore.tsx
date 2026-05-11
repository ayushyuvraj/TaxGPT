import { motion } from 'framer-motion'
import { Zap } from 'lucide-react'
import type { TaxHealthBreakdown } from '../lib/types'

const CIRCUMFERENCE = 2 * Math.PI * 40  // r=40 → 251.33

const GRADE_STROKE: Record<string, string> = {
  emerald: '#10b981',
  green:   '#22c55e',
  blue:    '#3b82f6',
  indigo:  '#6366f1',
  amber:   '#f59e0b',
  red:     '#ef4444',
}

const GRADE_TEXT: Record<string, string> = {
  emerald: 'text-emerald-400',
  green:   'text-green-400',
  blue:    'text-blue-400',
  indigo:  'text-indigo-400',
  amber:   'text-amber-400',
  red:     'text-red-400',
}

const GRADE_BG: Record<string, string> = {
  emerald: 'bg-emerald-500/15 border-emerald-500/40',
  green:   'bg-green-500/15 border-green-500/40',
  blue:    'bg-blue-500/15 border-blue-500/40',
  indigo:  'bg-indigo-500/15 border-indigo-500/40',
  amber:   'bg-amber-500/15 border-amber-500/40',
  red:     'bg-red-500/15 border-red-500/40',
}

const BAR_COLOR: Record<string, string> = {
  emerald: 'bg-emerald-500',
  green:   'bg-green-500',
  blue:    'bg-blue-500',
  indigo:  'bg-indigo-500',
  amber:   'bg-amber-500',
  red:     'bg-red-500',
}

interface Props {
  breakdown: TaxHealthBreakdown
  size?: 'full' | 'mini'
}

interface MiniProps {
  breakdown: TaxHealthBreakdown
}

export function TaxHealthScoreMini({ breakdown }: MiniProps) {
  const stroke = GRADE_STROKE[breakdown.gradeColor] ?? '#6366f1'
  const offset = CIRCUMFERENCE * (1 - breakdown.total / 100)
  const r = 12
  const c = 2 * Math.PI * r

  return (
    <div className="flex items-center gap-1.5">
      <svg width="28" height="28" viewBox="0 0 28 28" className="-rotate-90">
        <circle cx="14" cy="14" r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3" />
        <motion.circle
          cx="14" cy="14" r={r}
          fill="none"
          stroke={stroke}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - breakdown.total / 100) }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </svg>
      <span className={`text-xs font-bold tabular-nums ${GRADE_TEXT[breakdown.gradeColor]}`}>
        {breakdown.total}
      </span>
    </div>
  )
}

export function TaxHealthScore({ breakdown, size = 'full' }: Props) {
  if (size === 'mini') return <TaxHealthScoreMini breakdown={breakdown} />

  const stroke = GRADE_STROKE[breakdown.gradeColor] ?? '#6366f1'
  const offset = CIRCUMFERENCE * (1 - breakdown.total / 100)

  const components = [
    { label: 'Regime',    value: breakdown.regime,         max: 25 },
    { label: 'Deductions',value: breakdown.deductions,     max: 40 },
    { label: 'Compliance',value: breakdown.compliance,     max: 25 },
    { label: 'Filing',    value: breakdown.filingReadiness, max: 10 },
  ]

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1117]/70 p-5">
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
        {/* Ring */}
        <div className="relative shrink-0">
          <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.07)" strokeWidth="8" />
            <motion.circle
              cx="50" cy="50" r="40"
              fill="none"
              stroke={stroke}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              initial={{ strokeDashoffset: CIRCUMFERENCE }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 1.0, ease: 'easeOut', delay: 0.1 }}
            />
          </svg>
          {/* Score number in center */}
          <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
            <motion.span
              className={`text-2xl font-black tabular-nums leading-none ${GRADE_TEXT[breakdown.gradeColor]}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {breakdown.total}
            </motion.span>
            <span className="text-[9px] text-gray-600 font-medium mt-0.5 uppercase tracking-wider">/ 100</span>
          </div>
        </div>

        {/* Right side content */}
        <div className="flex-1 min-w-0 space-y-3 w-full">
          {/* Grade + label */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center rounded-full border px-3 py-1 text-sm font-black ${GRADE_BG[breakdown.gradeColor]} ${GRADE_TEXT[breakdown.gradeColor]}`}>
              {breakdown.grade}
            </span>
            <span className={`text-sm font-semibold ${GRADE_TEXT[breakdown.gradeColor]}`}>
              {breakdown.gradeLabel}
            </span>
            <span className="text-xs text-gray-600 font-medium uppercase tracking-wider ml-auto">
              Tax Health Score
            </span>
          </div>

          {/* Component bars */}
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            {components.map(c => (
              <div key={c.label}>
                <div className="flex justify-between text-[10px] text-gray-500 mb-1">
                  <span>{c.label}</span>
                  <span className="tabular-nums">{c.value}/{c.max}</span>
                </div>
                <div className="h-1.5 rounded-full bg-white/8 overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${BAR_COLOR[breakdown.gradeColor]}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.value / c.max) * 100}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: 0.2 }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Next action chip */}
          <div className="flex items-start gap-2 rounded-xl border border-white/8 bg-white/3 px-3 py-2">
            <Zap className="h-3.5 w-3.5 shrink-0 text-yellow-400 mt-0.5" />
            <div className="min-w-0">
              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">Next action · </span>
              <span className="text-xs text-gray-300">{breakdown.nextAction}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
