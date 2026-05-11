import { useMemo } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer,
} from 'recharts'
import type { RegimeResult } from '../lib/types'

const fmt = (n: number) =>
  n >= 100_000
    ? `₹${(n / 100_000).toFixed(1)}L`
    : `₹${n.toLocaleString('en-IN')}`

const SLAB_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#c084fc', '#e879f9', '#f472b6', '#fb7185']

interface CustomTooltipProps {
  active?: boolean
  payload?: Array<{ payload: { label: string; rate: string; income: number; tax: number } }>
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="rounded-xl border border-white/15 bg-[#0d1117]/95 p-3 shadow-2xl text-xs">
      <p className="font-bold text-white mb-1">{d.label}</p>
      <p className="text-gray-400">Rate: <span className="text-indigo-300 font-semibold">{d.rate}</span></p>
      <p className="text-gray-400">Income in slab: <span className="text-white font-semibold">{fmt(d.income)}</span></p>
      <p className="text-gray-400">Tax on slab: <span className="text-violet-300 font-semibold">{fmt(d.tax)}</span></p>
    </div>
  )
}

interface TaxWaterfallProps {
  regime: RegimeResult
  title: string
  accentColor: string
}

export function TaxWaterfall({ regime, title, accentColor }: TaxWaterfallProps) {
  const data = useMemo(() => {
    const rows = []

    // Deductions bar first
    const totalDeductions = Object.values(regime.deductions).reduce((a, b) => a + b, 0)
    if (totalDeductions > 0) {
      rows.push({
        label: 'Deductions',
        rate: 'Exempt',
        income: totalDeductions,
        tax: 0,
        color: '#10b981',
        barValue: totalDeductions,
      })
    }

    // Slab bars
    regime.slabs
      .filter(s => s.income_in_slab > 0)
      .forEach((s, i) => {
        rows.push({
          label: s.range_label,
          rate: `${s.rate_pct}%`,
          income: s.income_in_slab,
          tax: s.tax_on_slab,
          color: s.rate_pct === 0 ? '#22d3ee' : SLAB_COLORS[Math.min(i, SLAB_COLORS.length - 1)],
          barValue: s.income_in_slab,
        })
      })

    return rows
  }, [regime])

  const totalDeductions = Object.values(regime.deductions).reduce((a, b) => a + b, 0)

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0d1117]/70 p-5 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{title}</p>
          <p className="text-2xl font-black text-white mt-0.5">{fmt(regime.total_tax)}</p>
          <p className="text-xs text-gray-500">Effective rate: <span className="text-gray-300">{regime.effective_rate_pct}%</span></p>
        </div>
        <div className="text-right text-xs text-gray-500 space-y-1">
          <p>Gross: <span className="text-gray-300">{fmt(regime.gross_income)}</span></p>
          {totalDeductions > 0 && (
            <p>Deductions: <span className="text-emerald-400">−{fmt(totalDeductions)}</span></p>
          )}
          <p>Taxable: <span className="text-gray-300">{fmt(regime.taxable_income)}</span></p>
          {regime.rebate > 0 && (
            <p>Rebate: <span className="text-emerald-400">−{fmt(regime.rebate)}</span></p>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={180}>
        <BarChart data={data} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
          <XAxis
            dataKey="rate"
            tick={{ fill: '#6b7280', fontSize: 10 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis hide />
          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
          <Bar dataKey="barValue" radius={[4, 4, 0, 0]} maxBarSize={48}>
            {data.map((d, i) => (
              <Cell key={i} fill={d.color} fillOpacity={0.85} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Slab legend */}
      <div className="flex flex-wrap gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
            <span className="h-2 w-2 rounded-full shrink-0" style={{ background: d.color }} />
            <span>{d.rate} — {fmt(d.tax)}</span>
          </div>
        ))}
      </div>

      {/* Tax breakdown footer */}
      <div className="grid grid-cols-3 gap-2 border-t border-white/8 pt-3 text-xs">
        <div className="text-center">
          <p className="text-gray-500">Slab Tax</p>
          <p className="text-white font-semibold">{fmt(regime.slab_tax)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Rebate</p>
          <p className="text-emerald-400 font-semibold">−{fmt(regime.rebate)}</p>
        </div>
        <div className="text-center">
          <p className="text-gray-500">Cess (4%)</p>
          <p className="text-white font-semibold">{fmt(regime.cess)}</p>
        </div>
      </div>
    </div>
  )
}
