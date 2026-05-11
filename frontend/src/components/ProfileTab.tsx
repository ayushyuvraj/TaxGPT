import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Briefcase, TrendingUp, LineChart, Globe, Laptop,
  Loader, AlertCircle, Key, BookOpen, ChevronRight,
  Bookmark, FolderOpen,
} from 'lucide-react'
import { useProfileAnalysisStream, useComputeTax, type ProfileInputsData } from '../hooks/useProfile'
import { useApiKeyStore } from '../store/apiKeyStore'
import { useProfileSnapshotStore } from '../store/profileSnapshotStore'
import { computeTaxHealthScore } from '../lib/taxHealthScore'
import { AnswerWithCitations } from './AnswerWithCitations'
import { CompareActsModal } from './CompareActsModal'
import { TaxWaterfall } from './TaxWaterfall'
import { RegimeCompare } from './RegimeCompare'
import { SavingsRanker } from './SavingsRanker'
import { ComplianceCalendar } from './ComplianceCalendar'
import { TaxHealthScore } from './TaxHealthScore'
import { SavedProfilesPanel } from './SavedProfilesPanel'
import { useCompareFromNew, useCompareFromOld } from '../hooks/useCompare'
import type { Source } from '../lib/types'

// ── Profile definitions ───────────────────────────────────────────────────────
const PROFILES = [
  { id: 'salaried',   label: 'Salaried Employee',       icon: Briefcase,  color: '#6366f1', glow: '99,102,241'  },
  { id: 'business',   label: 'Business Owner',           icon: TrendingUp, color: '#f59e0b', glow: '245,158,11'  },
  { id: 'investor',   label: 'Investor',                 icon: LineChart,  color: '#10b981', glow: '16,185,129'  },
  { id: 'nri',        label: 'NRI',                      icon: Globe,      color: '#3b82f6', glow: '59,130,246'  },
  { id: 'freelancer', label: 'Freelancer / Consultant',  icon: Laptop,     color: '#ec4899', glow: '236,72,153'  },
] as const

type ProfileId = typeof PROFILES[number]['id']

// ── Input field schemas ───────────────────────────────────────────────────────
type FieldDef =
  | { key: string; label: string; type: 'number'; placeholder: string; unit: string }
  | { key: string; label: string; type: 'text';   placeholder: string }
  | { key: string; label: string; type: 'select'; options: { v: string; l: string }[] }
  | { key: string; label: string; type: 'multiselect'; options: string[] }

const PROFILE_FIELDS: Record<ProfileId, FieldDef[]> = {
  salaried: [
    { key: 'gross_income', label: 'Annual Gross Income (₹ Lakhs)', type: 'number', placeholder: 'e.g. 18', unit: 'L' },
    { key: 'hra_city',     label: 'HRA City Type', type: 'select', options: [{ v: 'metro', l: 'Metro (Mumbai/Delhi/Chennai/Kolkata)' }, { v: 'non-metro', l: 'Non-Metro' }] },
    { key: 'tax_regime',   label: 'Tax Regime', type: 'select', options: [{ v: 'new', l: 'New Regime (Default)' }, { v: 'old', l: 'Old Regime' }] },
  ],
  business: [
    { key: 'turnover',    label: 'Annual Turnover (₹ Lakhs)', type: 'number', placeholder: 'e.g. 150', unit: 'L' },
    { key: 'entity_type', label: 'Entity Type', type: 'select', options: [{ v: 'proprietor', l: 'Proprietor / Individual' }, { v: 'company', l: 'Company / Pvt Ltd' }, { v: 'llp', l: 'LLP' }] },
  ],
  investor: [
    { key: 'asset_types', label: 'Asset Types', type: 'multiselect', options: ['Equity', 'Mutual Funds', 'F&O', 'Crypto'] },
    { key: 'ltcg',        label: 'Estimated LTCG (₹ Lakhs)', type: 'number', placeholder: 'e.g. 5', unit: 'L' },
  ],
  nri: [
    { key: 'residence_country', label: 'Country of Residence', type: 'text',   placeholder: 'e.g. USA, UK, UAE' },
    { key: 'india_income_type', label: 'India Income Type',    type: 'select', options: [{ v: 'rental', l: 'Rental Income' }, { v: 'interest', l: 'Interest / Dividend' }, { v: 'salary', l: 'India-sourced Salary' }] },
  ],
  freelancer: [
    { key: 'annual_income', label: 'Annual Income (₹ Lakhs)',  type: 'number', placeholder: 'e.g. 12', unit: 'L' },
    { key: 'main_expense',  label: 'Main Expense Category',    type: 'text',   placeholder: 'e.g. Software, Travel, Equipment' },
  ],
}

// ── Impact badge ──────────────────────────────────────────────────────────────
function parseImpact(text: string): 'POSITIVE' | 'NEGATIVE' | 'MIXED' | null {
  const m = text.match(/\[IMPACT:\s*(POSITIVE|NEGATIVE|MIXED)\]/i)
  return (m?.[1]?.toUpperCase() ?? null) as 'POSITIVE' | 'NEGATIVE' | 'MIXED' | null
}

const IMPACT_STYLES = {
  POSITIVE: { bg: 'bg-emerald-500/20', border: 'border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400', label: 'Positive Impact' },
  NEGATIVE: { bg: 'bg-red-500/20',     border: 'border-red-500/40',     text: 'text-red-300',     dot: 'bg-red-400',     label: 'Negative Impact' },
  MIXED:    { bg: 'bg-amber-500/20',   border: 'border-amber-500/40',   text: 'text-amber-300',   dot: 'bg-amber-400',   label: 'Mixed Impact' },
}

function ImpactBadge({ impact }: { impact: 'POSITIVE' | 'NEGATIVE' | 'MIXED' }) {
  const s = IMPACT_STYLES[impact]
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold border ${s.bg} ${s.border} ${s.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
      {s.label}
    </span>
  )
}

// ── Section popup ─────────────────────────────────────────────────────────────
function is2025Source(source: Source): boolean {
  const h = (source.source ?? '').toLowerCase()
  return h.includes('2025') || h.includes('rules-2026') || h.includes('rules_2026') ||
         h.includes('faq') || h.includes('transition')
}

function SectionPopup({ source, onClose }: { source: Source | null; onClose: () => void }) {
  const section = source?.section ?? null
  const from2025 = source ? is2025Source(source) : false
  const fromNew = useCompareFromNew(from2025 && section ? section : null)
  const fromOld = useCompareFromOld(!from2025 && section ? section : null)

  if (!source || !section) return null

  const isLoading = from2025 ? fromNew.isLoading : fromOld.isLoading
  const oldSection = from2025 ? (fromNew.data?.old_section ?? section) : section
  const newSection = from2025 ? section : (fromOld.data?.new_section ?? section)

  return (
    <AnimatePresence>
      {isLoading ? (
        <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="flex items-center gap-3 bg-white/10 border border-white/20 rounded-xl px-6 py-4">
            <Loader className="h-5 w-5 text-indigo-400 animate-spin" />
            <span className="text-sm text-white">Loading section…</span>
          </div>
        </motion.div>
      ) : (
        <CompareActsModal key="modal" oldSection={oldSection} newSection={newSection} onClose={onClose} />
      )}
    </AnimatePresence>
  )
}

// ── Source pills ──────────────────────────────────────────────────────────────
function SourcePills({ sources }: { sources?: Source[] }) {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)

  if (!sources || sources.length === 0) return null

  const unique = Array.from(new Map(sources.map(s => [s.section || s.source, s])).values())
  const sectioned = unique.filter(s => s.section)
  const filesOnly  = unique.filter(s => !s.section)

  return (
    <div className="mt-4 pt-4 border-t border-white/8">
      <div className="flex items-center gap-1.5 mb-2">
        <BookOpen className="h-3 w-3 text-gray-500" />
        <span className="text-xs text-gray-500 font-medium">Referenced sections</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {sectioned.map((s, i) => (
          <button key={i} onClick={() => setSelectedSource(s)}
            className="flex items-center gap-1 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-2.5 py-1 text-xs text-indigo-300 hover:border-indigo-500/60 hover:bg-indigo-500/20 transition-all">
            <span className="font-mono font-semibold">§{s.section}</span>
          </button>
        ))}
        {filesOnly.map((s, i) => (
          <span key={i} className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-gray-400">
            {s.source}
          </span>
        ))}
      </div>
      <SectionPopup source={selectedSource} onClose={() => setSelectedSource(null)} />
    </div>
  )
}

// ── ProfileCard ───────────────────────────────────────────────────────────────
function ProfileCard({
  profile, isSelected, onClick,
}: {
  profile: typeof PROFILES[number]
  isSelected: boolean
  onClick: () => void
}) {
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const Icon = profile.icon

  const handleMouseMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top  + rect.height / 2
    setTilt({ x: (e.clientY - cy) / 8, y: -(e.clientX - cx) / 8 })
  }

  return (
    <motion.button
      whileTap={{ scale: 0.97 }}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setTilt({ x: 0, y: 0 })}
      onClick={onClick}
      style={{ transform: `perspective(600px) rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)` }}
      className={`relative rounded-2xl border p-5 text-center transition-all duration-200 w-full
        ${isSelected
          ? 'border-white/20 bg-white/10'
          : 'border-white/8 bg-white/4 hover:border-white/15 hover:bg-white/7'
        }`}
    >
      {isSelected && (
        <motion.div
          layoutId="profile-glow"
          className="absolute inset-0 rounded-2xl"
          style={{ boxShadow: `0 0 24px rgba(${profile.glow},0.25)`, background: `radial-gradient(ellipse at center, rgba(${profile.glow},0.12) 0%, transparent 70%)` }}
        />
      )}
      <div className="relative flex flex-col items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `rgba(${profile.glow},0.15)`, border: `1px solid rgba(${profile.glow},0.3)` }}>
          <Icon className="h-5 w-5" style={{ color: profile.color }} />
        </div>
        <p className="text-xs font-semibold text-gray-200 leading-tight">{profile.label}</p>
        {isSelected && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="flex h-4 w-4 items-center justify-center rounded-full"
            style={{ background: profile.color }}>
            <ChevronRight className="h-2.5 w-2.5 text-white" />
          </motion.div>
        )}
      </div>
    </motion.button>
  )
}

// ── Input form ────────────────────────────────────────────────────────────────
function ProfileForm({
  profileId, profile, onSubmit, isLoading,
}: {
  profileId: ProfileId
  profile: typeof PROFILES[number]
  onSubmit: (inputs: ProfileInputsData) => void
  isLoading: boolean
}) {
  const [values, setValues] = useState<Record<string, string | string[]>>({})
  const fields = PROFILE_FIELDS[profileId]

  const set = (key: string, val: string | string[]) => setValues(prev => ({ ...prev, [key]: val }))

  const toggleMulti = (key: string, option: string) => {
    const current = (values[key] as string[]) ?? []
    set(key, current.includes(option) ? current.filter(o => o !== option) : [...current, option])
  }

  const handleSubmit = () => {
    const inputs: ProfileInputsData = {}
    for (const f of fields) {
      const v = values[f.key]
      if (!v) continue
      if (f.type === 'number') {
        const n = parseInt(v as string)
        if (!isNaN(n)) (inputs as Record<string, unknown>)[f.key] = n
      } else if (f.type === 'multiselect') {
        const arr = v as string[]
        if (arr.length > 0) (inputs as Record<string, unknown>)[f.key] = arr.map(s => s.toLowerCase().replace('&', '').replace(' ', '_'))
      } else {
        if (v) (inputs as Record<string, unknown>)[f.key] = v
      }
    }
    onSubmit(inputs)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className="rounded-2xl border border-white/10 bg-white/4 p-5 space-y-4"
    >
      <div className="flex items-center gap-2 mb-1">
        <profile.icon className="h-4 w-4" style={{ color: profile.color }} />
        <span className="text-sm font-semibold text-white">{profile.label}</span>
        <span className="text-xs text-gray-500">— fill in your details for a personalised analysis</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {fields.map(f => (
          <div key={f.key}>
            <label className="block text-xs font-medium text-gray-400 mb-1">{f.label}</label>

            {f.type === 'number' && (
              <div className="relative">
                <input type="number" placeholder={f.placeholder} value={(values[f.key] as string) ?? ''}
                  onChange={e => set(f.key, e.target.value)}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors pr-6" />
                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-gray-500">{f.unit}</span>
              </div>
            )}
            {f.type === 'text' && (
              <input type="text" placeholder={f.placeholder} value={(values[f.key] as string) ?? ''}
                onChange={e => set(f.key, e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-600 focus:outline-none focus:border-indigo-500/60 transition-colors" />
            )}
            {f.type === 'select' && (
              <select value={(values[f.key] as string) ?? ''} onChange={e => set(f.key, e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-[#0d1117] px-3 py-2 text-sm text-white focus:outline-none focus:border-indigo-500/60 transition-colors">
                <option value="">Select…</option>
                {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            )}
            {f.type === 'multiselect' && (
              <div className="flex flex-wrap gap-2">
                {f.options.map(o => {
                  const selected = ((values[f.key] as string[]) ?? []).includes(o)
                  return (
                    <button key={o} type="button" onClick={() => toggleMulti(f.key, o)}
                      className={`rounded-full border px-3 py-1 text-xs font-medium transition-all ${
                        selected ? 'border-indigo-500/60 bg-indigo-500/20 text-indigo-300' : 'border-white/10 bg-white/5 text-gray-400 hover:border-white/20'
                      }`}>
                      {o}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3 pt-1">
        <motion.button
          whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
          onClick={handleSubmit}
          disabled={isLoading}
          style={{ background: `linear-gradient(135deg, ${profile.color}cc, ${profile.color})` }}
          className="flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transition-all"
        >
          {isLoading ? <Loader className="h-4 w-4 animate-spin" /> : <profile.icon className="h-4 w-4" />}
          {isLoading ? 'Analysing…' : 'Analyse My Tax Impact'}
        </motion.button>
        <p className="text-xs text-gray-600">All fields optional — leave blank for representative analysis</p>
      </div>
    </motion.div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
interface ProfileTabProps {
  onOpenSettings?: () => void
}

export function ProfileTab({ onOpenSettings }: ProfileTabProps) {
  const [selectedId, setSelectedId]         = useState<ProfileId | null>(null)
  const [selectedSource, setSelectedSource] = useState<Source | null>(null)
  const [panelOpen, setPanelOpen]           = useState(false)
  const mountedRef = useRef(false)

  const computeTax   = useComputeTax()
  const ragStream    = useProfileAnalysisStream()
  const store        = useProfileSnapshotStore()

  const { provider, geminiKey, anthropicKey, openaiKey, openrouterKey, ollamaUrl } = useApiKeyStore()
  const apiKey =
    provider === 'gemini'     ? geminiKey     :
    provider === 'anthropic'  ? anthropicKey  :
    provider === 'openai'     ? openaiKey     :
    provider === 'openrouter' ? openrouterKey :
    provider === 'ollama'     ? ollamaUrl     : ''

  // ── On mount: restore from active snapshot if no draft ──────────────────────
  useEffect(() => {
    if (mountedRef.current) return
    mountedRef.current = true
    const activeSnap = store.activeSnapshotId
      ? store.snapshots.find(s => s.id === store.activeSnapshotId)
      : null
    if (activeSnap && !store.draftTaxData) {
      store.setDraft({
        taxData: activeSnap.taxData,
        ragAnalysis: activeSnap.ragAnalysis,
        sources: activeSnap.sources,
        profileType: activeSnap.profileType,
        inputs: activeSnap.inputs,
        isStreaming: false,
      })
      setSelectedId(activeSnap.profileType as ProfileId)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Sync live rag stream into store (survives tab switch) ────────────────────
  useEffect(() => {
    if (ragStream.streamingAnswer || ragStream.isStreaming) {
      store.setDraft({
        ragAnalysis: ragStream.streamingAnswer,
        sources: ragStream.sources,
        isStreaming: ragStream.isStreaming,
      })
    }
  }, [ragStream.streamingAnswer, ragStream.isStreaming, ragStream.sources]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived state ────────────────────────────────────────────────────────────
  const selectedProfile = PROFILES.find(p => p.id === selectedId) ?? null
  const isLoading = computeTax.isPending || ragStream.isStreaming

  // Read from store (survives tab switch; null until first analysis)
  const taxData      = store.draftTaxData
  const displayAnswer = (store.draftRagAnalysis || ragStream.streamingAnswer)
    .replace(/\[IMPACT:\s*(POSITIVE|NEGATIVE|MIXED)\]\n?/gi, '')
  const displaySources = store.draftSources.length > 0 ? store.draftSources : ragStream.sources
  const isCurrentlyStreaming = ragStream.isStreaming || store.draftIsStreaming

  const activeSnap = store.activeSnapshotId
    ? store.snapshots.find(s => s.id === store.activeSnapshotId)
    : null
  const completedActionNames = activeSnap?.completedActionNames ?? []

  const healthBreakdown = taxData
    ? (activeSnap
        ? activeSnap.taxHealthBreakdown  // pre-computed in store, reactive on action toggles
        : computeTaxHealthScore(taxData, [], store.draftProfileType ?? '', store.draftInputs?.tax_regime))
    : null

  const hasDraft = !!store.draftTaxData
  const isUnsaved = hasDraft && !store.activeSnapshotId

  const impact = parseImpact(store.draftRagAnalysis || ragStream.streamingAnswer)

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const handleSelectProfile = (id: ProfileId) => {
    if (selectedId !== id) {
      computeTax.reset()
      ragStream.reset()
      store.clearDraft()
    }
    setSelectedId(id)
  }

  const handleAnalyze = (inputs: ProfileInputsData) => {
    if (!selectedId) return
    store.clearDraft()
    store.setDraft({ profileType: selectedId, inputs, isStreaming: true })
    computeTax.mutate(
      { profileType: selectedId, inputs },
      {
        onSuccess: data => store.setDraft({ taxData: data }),
        onError: () => store.setDraft({ isStreaming: false }),
      }
    )
    ragStream.startStream({ profileType: selectedId, inputs })
  }

  const handleSave = () => {
    if (!store.draftTaxData || !store.draftProfileType) return
    store.addSnapshot({
      profileType: store.draftProfileType as 'salaried' | 'business' | 'investor' | 'nri' | 'freelancer',
      inputs: store.draftInputs ?? {},
      taxData: store.draftTaxData,
      ragAnalysis: store.draftRagAnalysis,
      sources: store.draftSources,
      submittedRegime: store.draftInputs?.tax_regime,
    })
  }

  const handleLoadSnapshot = (id: string) => {
    const snap = store.snapshots.find(s => s.id === id)
    if (!snap) return
    computeTax.reset()
    ragStream.reset()
    store.setActive(id)
    store.setDraft({
      taxData: snap.taxData,
      ragAnalysis: snap.ragAnalysis,
      sources: snap.sources,
      profileType: snap.profileType,
      inputs: snap.inputs,
      isStreaming: false,
    })
    setSelectedId(snap.profileType as ProfileId)
  }

  // ── No API key guard ──────────────────────────────────────────────────────────
  if (!apiKey) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="flex flex-col items-center justify-center min-h-96 rounded-2xl border border-amber-500/20 bg-amber-500/5 backdrop-blur-2xl text-center p-8">
        <AlertCircle className="h-12 w-12 text-amber-400 mb-4" />
        <h3 className="text-xl font-bold text-white mb-2">API Key Required</h3>
        <p className="text-gray-400 text-sm mb-6">Configure at least one AI provider to use profile analysis</p>
        {onOpenSettings && (
          <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={onOpenSettings}
            className="flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-semibold text-white bg-gradient-to-r from-indigo-600 to-violet-600 hover:shadow-lg hover:shadow-indigo-500/30 transition-all">
            <Key className="h-4 w-4" />
            Configure Providers
          </motion.button>
        )}
      </motion.div>
    )
  }

  return (
    <div className="space-y-5">

      {/* Profile cards + Saved Analyses button */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Select Your Profile</p>
          <motion.button
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            onClick={() => setPanelOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-gray-400 hover:border-white/20 hover:text-white transition-all"
          >
            <FolderOpen className="h-3.5 w-3.5" />
            Saved Analyses
            {store.snapshots.length > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-500/30 text-[9px] font-bold text-indigo-300">
                {store.snapshots.length}
              </span>
            )}
          </motion.button>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {PROFILES.map(p => (
            <ProfileCard key={p.id} profile={p} isSelected={selectedId === p.id}
              onClick={() => handleSelectProfile(p.id)} />
          ))}
        </div>
      </div>

      {/* Input form */}
      <AnimatePresence>
        {selectedId && selectedProfile && (
          <ProfileForm key={selectedId} profileId={selectedId} profile={selectedProfile}
            onSubmit={handleAnalyze} isLoading={isLoading} />
        )}
      </AnimatePresence>

      {/* Errors */}
      {(computeTax.error || ragStream.error) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl p-4 flex gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Analysis Failed</p>
            <p className="text-xs mt-1">{(computeTax.error as Error)?.message ?? ragStream.error}</p>
          </div>
        </motion.div>
      )}

      {/* ── Tax dashboard (instant once compute-tax returns, survives tab switch) ── */}
      <AnimatePresence>
        {taxData && (
          <motion.div key="dashboard" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
            className="space-y-5">

            {/* Header row: Health Score + Save/Loaded status */}
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div className="flex-1 min-w-0">
                {healthBreakdown && (
                  <TaxHealthScore breakdown={healthBreakdown} />
                )}
              </div>
            </div>

            {/* Save / Loaded indicator */}
            <div className="flex items-center justify-end gap-3">
              {activeSnap && (
                <div className="flex items-center gap-2 rounded-xl border border-indigo-500/25 bg-indigo-500/8 px-3 py-1.5">
                  <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
                  <span className="text-xs text-indigo-300 font-medium">{activeSnap.name}</span>
                </div>
              )}
              {isUnsaved && (
                <motion.button
                  whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                  onClick={handleSave}
                  className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-1.5 text-sm font-semibold text-emerald-300 hover:bg-emerald-500/20 transition-all"
                >
                  <Bookmark className="h-3.5 w-3.5" />
                  Save Analysis
                </motion.button>
              )}
            </div>

            {/* Waterfall + Regime side by side */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
              <TaxWaterfall
                regime={taxData.new_regime}
                title="New Regime (Act 2025)"
                accentColor="#6366f1"
              />
              <RegimeCompare data={taxData} />
            </div>

            {/* Savings Ranker with action tracking */}
            <SavingsRanker
              opportunities={taxData.savings_opportunities}
              snapshotId={store.activeSnapshotId ?? undefined}
            />

            {/* Compliance Calendar */}
            <ComplianceCalendar deadlines={taxData.deadlines} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* RAG narrative (Pillar 1) */}
      <AnimatePresence>
        {(isCurrentlyStreaming || displayAnswer) && (
          <motion.div key="rag" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="rounded-2xl border border-white/10 bg-[#0d1117]/80 backdrop-blur-2xl p-6 space-y-4">

            <div className="flex items-center gap-3 flex-wrap">
              {selectedProfile && (
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                    style={{ background: `rgba(${selectedProfile.glow},0.15)` }}>
                    <selectedProfile.icon className="h-4 w-4" style={{ color: selectedProfile.color }} />
                  </div>
                  <span className="text-sm font-semibold text-white">{selectedProfile.label}</span>
                </div>
              )}
              {impact && <ImpactBadge impact={impact} />}
              {isCurrentlyStreaming && (
                <span className="flex items-center gap-1.5 text-xs text-gray-500">
                  <Loader className="h-3 w-3 animate-spin" />
                  Generating Act citations…
                </span>
              )}
            </div>

            <div className="text-gray-200 prose-sm">
              <AnswerWithCitations answer={displayAnswer} sources={displaySources}
                onCitationClick={setSelectedSource} />
            </div>

            {!isCurrentlyStreaming && displaySources.length > 0 && (
              <SourcePills sources={displaySources} />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!selectedId && !taxData && !displayAnswer && !ragStream.error && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center min-h-64 rounded-2xl border border-white/8 bg-[#0d1117]/70 backdrop-blur-2xl text-center px-8">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 mb-4">
            <Briefcase className="h-7 w-7 text-indigo-400" />
          </div>
          <h3 className="text-lg font-semibold text-white mb-2">Personal Tax Intelligence</h3>
          <p className="text-gray-500 text-sm max-w-sm">
            Select your profile, fill in your numbers, and get real tax computation + Act 2025 citations + savings opportunities — all in one place.
          </p>
        </motion.div>
      )}

      <SectionPopup source={selectedSource} onClose={() => setSelectedSource(null)} />

      {/* Saved Profiles Panel */}
      <SavedProfilesPanel
        isOpen={panelOpen}
        onClose={() => setPanelOpen(false)}
        onLoadSnapshot={handleLoadSnapshot}
        onSaveCurrent={() => { handleSave(); setPanelOpen(false) }}
        hasDraft={isUnsaved}
      />
    </div>
  )
}
