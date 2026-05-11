import { motion } from 'framer-motion'
import { FileText, CreditCard, TrendingUp, RefreshCw, Calendar } from 'lucide-react'
import type { Deadline } from '../lib/types'

const ICON_MAP = {
  filing:     FileText,
  payment:    CreditCard,
  investment: TrendingUp,
  transition: RefreshCw,
}

const TYPE_STYLES = {
  filing:     { dot: 'bg-blue-400',   border: 'border-blue-500/30',   bg: 'bg-blue-500/8',   label: 'text-blue-300'   },
  payment:    { dot: 'bg-violet-400', border: 'border-violet-500/30', bg: 'bg-violet-500/8', label: 'text-violet-300' },
  investment: { dot: 'bg-emerald-400',border: 'border-emerald-500/30',bg: 'bg-emerald-500/8',label: 'text-emerald-300'},
  transition: { dot: 'bg-amber-400',  border: 'border-amber-500/30',  bg: 'bg-amber-500/8',  label: 'text-amber-300'  },
}

function urgencyColor(daysAway: number): string {
  if (daysAway < 0)  return 'bg-gray-700 text-gray-400 border-gray-700'
  if (daysAway <= 14) return 'bg-red-500/20 text-red-300 border-red-500/40'
  if (daysAway <= 30) return 'bg-amber-500/20 text-amber-300 border-amber-500/40'
  return 'bg-white/8 text-gray-300 border-white/15'
}

function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

function daysLabel(days: number): string {
  if (days < 0) return 'Passed'
  if (days === 0) return 'Today'
  if (days === 1) return 'Tomorrow'
  return `${days}d away`
}

function fmtAmount(n: number): string {
  return n >= 100_000 ? `₹${(n / 100_000).toFixed(1)}L` : `₹${n.toLocaleString('en-IN')}`
}

interface ComplianceCalendarProps {
  deadlines: Deadline[]
}

export function ComplianceCalendar({ deadlines }: ComplianceCalendarProps) {
  const sorted = [...deadlines].sort((a, b) => a.date_str.localeCompare(b.date_str))

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1117]/70 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-blue-400" />
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Your Compliance Calendar</p>
          <p className="text-xs text-gray-600">Personalised deadlines based on your profile</p>
        </div>
      </div>

      {/* Type legend */}
      <div className="flex flex-wrap gap-3">
        {Object.entries(TYPE_STYLES).map(([type, s]) => (
          <div key={type} className="flex items-center gap-1.5 text-xs text-gray-500">
            <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
            <span className="capitalize">{type}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative pl-5">
        {/* Vertical line */}
        <div className="absolute left-2 top-2 bottom-2 w-px bg-white/8" />

        <div className="space-y-3">
          {sorted.map((d, i) => {
            const Icon = ICON_MAP[d.deadline_type] ?? FileText
            const typeStyle = TYPE_STYLES[d.deadline_type] ?? TYPE_STYLES.filing
            const past = d.days_away < 0

            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`relative rounded-xl border p-3 ${typeStyle.border} ${typeStyle.bg} ${past ? 'opacity-40' : ''}`}
              >
                {/* Dot on timeline */}
                <div className={`absolute -left-[1.35rem] top-4 h-2.5 w-2.5 rounded-full border-2 border-[#0d1117] ${typeStyle.dot}`} />

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg ${typeStyle.bg} border ${typeStyle.border}`}>
                      <Icon className={`h-3 w-3 ${typeStyle.label}`} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white leading-tight">{d.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{d.detail}</p>
                      {d.amount_hint && d.amount_hint > 0 && (
                        <p className="text-xs text-violet-300 mt-1 font-semibold">
                          Pay approx. {fmtAmount(d.amount_hint)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-600">{formatDate(d.date_str)}</span>
                        <span className={`rounded-full border px-1.5 py-0.5 text-[10px] font-mono font-bold text-indigo-400 border-indigo-500/30 bg-indigo-500/10`}>
                          §{d.section}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Days away chip */}
                  <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold ${urgencyColor(d.days_away)}`}>
                    {daysLabel(d.days_away)}
                  </span>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
