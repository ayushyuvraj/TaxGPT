import { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Wallet, Briefcase, TrendingUp, Globe, Scale, Lightbulb,
  Home, ShieldCheck, Layers, Settings2, UserCheck, Receipt,
  Gavel, LayoutGrid, Banknote, Percent, Calendar, FileStack,
  ClipboardCheck, AlertTriangle, BookOpen, FileText,
} from 'lucide-react'
import type { MappingEntry } from '../lib/types'

type IconType = React.ComponentType<{ className?: string; style?: React.CSSProperties }>

export interface CatConfig {
  id: string
  label: string
  color: string
  Icon: IconType
  desc: string
  span?: number
}

export const BENTO_CATS: CatConfig[] = [
  { id: 'deductions',     label: 'Deductions',     color: '#a78bfa', Icon: Wallet,         desc: '§80C, §80D and all deduction chapters',        span: 2 },
  { id: 'capital_gains',  label: 'Capital Gains',  color: '#34d399', Icon: TrendingUp,     desc: 'LTCG, STCG, STT and all asset transfers',      span: 2 },
  { id: 'business',       label: 'Business',       color: '#60a5fa', Icon: Briefcase,      desc: 'Business income and presumptive tax' },
  { id: 'penalties',      label: 'Penalties',      color: '#f87171', Icon: AlertTriangle,  desc: 'Late filing, concealment, defaults' },
  { id: 'assessment',     label: 'Assessment',     color: '#fb923c', Icon: ClipboardCheck, desc: 'Scrutiny, reopening, best judgment' },
  { id: 'international',  label: 'International',  color: '#22d3ee', Icon: Globe,          desc: 'DTAA, transfer pricing, POEM' },
  { id: 'definitions',    label: 'Definitions',    color: '#94a3b8', Icon: BookOpen,       desc: 'Key terms and interpretation clauses' },
  { id: 'appeals',        label: 'Appeals',        color: '#fbbf24', Icon: Scale,          desc: 'CIT(A), ITAT, High Court, Supreme Court' },
  { id: 'income',         label: 'Income',         color: '#4ade80', Icon: Banknote,       desc: 'Heads of income and chargeability' },
  { id: 'returns',        label: 'Returns',        color: '#6366f1', Icon: FileText,       desc: 'ITR filing deadlines and requirements' },
  { id: 'house_property', label: 'House Property', color: '#2dd4bf', Icon: Home,           desc: 'HRA, home loan interest, let-out' },
  { id: 'tds',            label: 'TDS',            color: '#38bdf8', Icon: Layers,         desc: 'Tax deducted at source — §393 consolidated' },
  { id: 'salary',         label: 'Salary',         color: '#fb7185', Icon: UserCheck,      desc: 'Perquisites, allowances, standard deduction' },
  { id: 'advance_tax',    label: 'Advance Tax',    color: '#818cf8', Icon: Calendar,       desc: 'Quarterly advance tax instalments' },
  { id: 'interest',       label: 'Interest',       color: '#f472b6', Icon: Percent,        desc: 'Interest on delayed payments and refunds' },
  { id: 'exemptions',     label: 'Exemptions',     color: '#a3e635', Icon: ShieldCheck,    desc: 'Agricultural, charitable, HUF exemptions' },
  { id: 'procedures',     label: 'Procedures',     color: '#64748b', Icon: Settings2,      desc: 'Search, seizure and rectification' },
  { id: 'tcs',            label: 'TCS',            color: '#fdba74', Icon: Receipt,        desc: 'Tax collected at source by sellers' },
  { id: 'prosecution',    label: 'Prosecution',    color: '#ef4444', Icon: Gavel,          desc: 'Criminal offences and prosecution' },
  { id: 'general',        label: 'General',        color: '#6b7280', Icon: LayoutGrid,     desc: 'Administrative and miscellaneous' },
  { id: '_concepts',      label: 'Concepts',       color: '#fde047', Icon: Lightbulb,      desc: '16 key terminology changes',                   span: 2 },
  { id: '_forms',         label: 'Forms',          color: '#67e8f9', Icon: FileStack,      desc: '17 tax form numbers changed — ITR, TDS, PAN',  span: 4 },
]

export function groupEntries(entries: MappingEntry[]): Record<string, MappingEntry[]> {
  const map: Record<string, MappingEntry[]> = {}
  for (const entry of entries) {
    const key =
      entry.type === 'concept' ? '_concepts' :
      entry.type === 'form'    ? '_forms' :
      (entry as Extract<MappingEntry, { type: 'section' }>).category || 'general'
    if (!map[key]) map[key] = []
    map[key].push(entry)
  }
  return map
}

interface CategoryBentoProps {
  entries: MappingEntry[]
  onCategoryClick: (catId: string, entries: MappingEntry[], cfg: CatConfig) => void
  activeCatId?: string | null
}

export function CategoryBento({ entries, onCategoryClick, activeCatId }: CategoryBentoProps) {
  const grouped = useMemo(() => groupEntries(entries), [entries])

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridAutoRows: '1fr',
        height: '100%',
        gap: '8px',
      }}
    >
      {BENTO_CATS.map(cfg => {
        const count = grouped[cfg.id]?.length ?? 0
        if (count === 0) return null
        const span = cfg.span ?? 1
        const isActive = activeCatId === cfg.id
        const isDimmed = activeCatId != null && !isActive

        return (
          <motion.button
            key={cfg.id}
            onClick={() => onCategoryClick(cfg.id, grouped[cfg.id] ?? [], cfg)}
            style={{
              gridColumn: `span ${span}`,
              background: isActive
                ? `linear-gradient(135deg, ${cfg.color}22 0%, ${cfg.color}0e 100%)`
                : 'rgba(255,255,255,0.025)',
              borderColor: isActive ? `${cfg.color}55` : 'rgba(255,255,255,0.07)',
              opacity: isDimmed ? 0.35 : 1,
            }}
            className="relative overflow-hidden text-left rounded-2xl border group transition-opacity duration-200"
            whileHover={{ y: -1, transition: { duration: 0.1 } }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Hover glow */}
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl"
              style={{ background: `radial-gradient(ellipse at 25% 40%, ${cfg.color}18 0%, transparent 65%)` }}
            />
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none rounded-2xl border"
              style={{ borderColor: `${cfg.color}40` }}
            />

            {/* Horizontal layout: icon | label+desc | count */}
            <div className="relative h-full flex items-center gap-3 px-3 py-2">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl" style={{ background: `${cfg.color}1a` }}>
                <cfg.Icon className="h-4 w-4" style={{ color: cfg.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white/90 leading-tight truncate">{cfg.label}</p>
                <p className="text-[10px] text-white/40 leading-snug truncate mt-0.5">{cfg.desc}</p>
              </div>
              <span
                className="shrink-0 text-[11px] font-bold tabular-nums px-1.5 py-0.5 rounded leading-none"
                style={{ background: `${cfg.color}18`, color: cfg.color }}
              >
                {count}
              </span>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
