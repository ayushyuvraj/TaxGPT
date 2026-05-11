import { motion } from 'framer-motion'
import type { TaxComputationResponse } from '../lib/types'

const fmt = (n: number) =>
  n >= 100_000
    ? `₹${(n / 100_000).toFixed(2)}L`
    : `₹${n.toLocaleString('en-IN')}`

interface RegimeCompareProps {
  data: TaxComputationResponse
}

export function RegimeCompare({ data }: RegimeCompareProps) {
  const { new_regime, old_regime, winner, winner_saving } = data

  const maxTax = Math.max(new_regime.total_tax, old_regime.total_tax, 1)
  const newPct  = (new_regime.total_tax / maxTax) * 100
  const oldPct  = (old_regime.total_tax / maxTax) * 100

  const winnerLabel = winner === 'new' ? 'New Regime' : 'Old Regime'
  const winnerColor = winner === 'new' ? 'text-indigo-300' : 'text-amber-300'

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1117]/70 p-5 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Regime Comparison</p>
          <p className="text-sm text-gray-300 mt-0.5">
            <span className={`font-bold ${winnerColor}`}>{winnerLabel}</span> saves you{' '}
            <span className="font-bold text-emerald-400">{fmt(winner_saving)}</span>
          </p>
        </div>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${
          winner === 'new'
            ? 'border-indigo-500/50 bg-indigo-500/15 text-indigo-300'
            : 'border-amber-500/50 bg-amber-500/15 text-amber-300'
        }`}>
          {winnerLabel} Wins
        </span>
      </div>

      {/* Bars */}
      <div className="space-y-4">
        {/* New Regime */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              {winner === 'new' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />}
              New Regime (Act 2025)
            </span>
            <span className="font-bold text-white">{fmt(new_regime.total_tax)}</span>
          </div>
          <div className="h-8 rounded-lg bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${newPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
              className="h-full rounded-lg"
              style={{ background: 'linear-gradient(90deg, #4f46e5, #7c3aed)' }}
            />
          </div>
          <p className="text-xs text-gray-600">Effective rate: {new_regime.effective_rate_pct}%</p>
        </div>

        {/* Old Regime */}
        <div className="space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="font-semibold text-gray-300 flex items-center gap-1.5">
              {winner === 'old' && <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 inline-block" />}
              Old Regime (1961 Act)
            </span>
            <span className="font-bold text-white">{fmt(old_regime.total_tax)}</span>
          </div>
          <div className="h-8 rounded-lg bg-white/5 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${oldPct}%` }}
              transition={{ duration: 0.8, ease: 'easeOut', delay: 0.2 }}
              className="h-full rounded-lg"
              style={{ background: 'linear-gradient(90deg, #b45309, #d97706)' }}
            />
          </div>
          <p className="text-xs text-gray-600">Effective rate: {old_regime.effective_rate_pct}% (incl. 80C/80D deductions)</p>
        </div>
      </div>

      {/* Difference chip */}
      <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 flex items-center justify-between">
        <span className="text-xs text-gray-400">Difference</span>
        <div className="text-right">
          <span className="text-sm font-black text-emerald-400">{fmt(winner_saving)}</span>
          <p className="text-xs text-gray-500">saved with {winnerLabel}</p>
        </div>
      </div>

      {/* Quick breakdown */}
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="rounded-xl border border-indigo-500/15 bg-indigo-500/5 p-3">
          <p className="text-gray-500 mb-2 font-semibold">New Regime deductions</p>
          {Object.entries(new_regime.deductions).length === 0
            ? <p className="text-gray-600 italic">None</p>
            : Object.entries(new_regime.deductions).map(([k, v]) => (
                <div key={k} className="flex justify-between text-gray-400">
                  <span className="truncate mr-2">{k}</span>
                  <span className="text-emerald-400 shrink-0">−{fmt(v)}</span>
                </div>
              ))
          }
        </div>
        <div className="rounded-xl border border-amber-500/15 bg-amber-500/5 p-3">
          <p className="text-gray-500 mb-2 font-semibold">Old Regime deductions</p>
          {Object.entries(old_regime.deductions).map(([k, v]) => (
            <div key={k} className="flex justify-between text-gray-400">
              <span className="truncate mr-2">{k}</span>
              <span className="text-emerald-400 shrink-0">−{fmt(v)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
