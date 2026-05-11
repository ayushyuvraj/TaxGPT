import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  ProfileSnapshot,
  TaxComputationResponse,
  ProfileInputsData,
  Source,
} from '../lib/types'
import { computeTaxHealthScore } from '../lib/taxHealthScore'

const MAX_SNAPSHOTS = 10

function generateId(): string {
  return `snap_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`
}

const PROFILE_LABELS: Record<string, string> = {
  salaried: 'Salaried',
  business: 'Business',
  investor: 'Investor',
  nri: 'NRI',
  freelancer: 'Freelancer',
}

function autoName(profileType: string, grossIncome: number): string {
  const label = PROFILE_LABELS[profileType] ?? profileType
  const income =
    grossIncome >= 100_000
      ? `₹${(grossIncome / 100_000).toFixed(0)}L`
      : `₹${grossIncome.toLocaleString('en-IN')}`
  const month = new Date().toLocaleString('en-IN', { month: 'short', year: 'numeric' })
  return `${label} ${income} · ${month}`
}

interface ProfileSnapshotStore {
  // ── Persisted ────────────────────────────────────────────────────────────────
  snapshots: ProfileSnapshot[]
  activeSnapshotId: string | null

  // ── In-memory draft (tab-switch safe, not persisted across page refresh) ─────
  draftTaxData: TaxComputationResponse | null
  draftRagAnalysis: string
  draftSources: Source[]
  draftProfileType: string | null
  draftInputs: ProfileInputsData | null
  draftIsStreaming: boolean

  // ── Actions ───────────────────────────────────────────────────────────────────
  addSnapshot: (data: {
    profileType: ProfileSnapshot['profileType']
    inputs: ProfileInputsData
    taxData: TaxComputationResponse
    ragAnalysis: string
    sources: Source[]
    submittedRegime?: string
  }) => string
  updateSnapshot: (id: string, update: Partial<ProfileSnapshot>) => void
  deleteSnapshot: (id: string) => void
  setActive: (id: string | null) => void
  toggleActionDone: (id: string, actionName: string) => void
  renameSnapshot: (id: string, name: string) => void
  updateNotes: (id: string, notes: string) => void

  setDraft: (data: {
    taxData?: TaxComputationResponse | null
    ragAnalysis?: string
    sources?: Source[]
    profileType?: string | null
    inputs?: ProfileInputsData | null
    isStreaming?: boolean
  }) => void
  clearDraft: () => void
}

export const useProfileSnapshotStore = create<ProfileSnapshotStore>()(
  persist(
    (set, get) => ({
      snapshots: [],
      activeSnapshotId: null,

      draftTaxData: null,
      draftRagAnalysis: '',
      draftSources: [],
      draftProfileType: null,
      draftInputs: null,
      draftIsStreaming: false,

      addSnapshot: ({ profileType, inputs, taxData, ragAnalysis, sources, submittedRegime }) => {
        const id = generateId()
        const name = autoName(profileType, taxData.gross_income)
        const breakdown = computeTaxHealthScore(taxData, [], profileType, submittedRegime)
        const snap: ProfileSnapshot = {
          id,
          name,
          profileType,
          inputs,
          taxData,
          ragAnalysis,
          sources,
          createdAt: new Date().toISOString(),
          completedActionNames: [],
          taxHealthScore: breakdown.total,
          taxHealthBreakdown: breakdown,
          notes: '',
        }
        set(state => {
          let snaps = [snap, ...state.snapshots]
          if (snaps.length > MAX_SNAPSHOTS) snaps = snaps.slice(0, MAX_SNAPSHOTS)
          return { snapshots: snaps, activeSnapshotId: id }
        })
        return id
      },

      updateSnapshot: (id, update) => {
        set(state => ({
          snapshots: state.snapshots.map(s => {
            if (s.id !== id) return s
            const updated = { ...s, ...update }
            if (update.completedActionNames !== undefined || update.taxData !== undefined) {
              const breakdown = computeTaxHealthScore(
                updated.taxData,
                updated.completedActionNames,
                updated.profileType,
              )
              updated.taxHealthScore = breakdown.total
              updated.taxHealthBreakdown = breakdown
            }
            return updated
          }),
        }))
      },

      deleteSnapshot: id => {
        set(state => {
          const remaining = state.snapshots.filter(s => s.id !== id)
          return {
            snapshots: remaining,
            activeSnapshotId:
              state.activeSnapshotId === id
                ? (remaining[0]?.id ?? null)
                : state.activeSnapshotId,
          }
        })
      },

      setActive: id => set({ activeSnapshotId: id }),

      toggleActionDone: (id, actionName) => {
        const snap = get().snapshots.find(s => s.id === id)
        if (!snap) return
        const already = snap.completedActionNames.includes(actionName)
        const updated = already
          ? snap.completedActionNames.filter(n => n !== actionName)
          : [...snap.completedActionNames, actionName]
        get().updateSnapshot(id, { completedActionNames: updated })
      },

      renameSnapshot: (id, name) => get().updateSnapshot(id, { name }),
      updateNotes: (id, notes) => get().updateSnapshot(id, { notes }),

      setDraft: data =>
        set(state => ({
          draftTaxData:      data.taxData      !== undefined ? data.taxData      : state.draftTaxData,
          draftRagAnalysis:  data.ragAnalysis  !== undefined ? data.ragAnalysis  : state.draftRagAnalysis,
          draftSources:      data.sources      !== undefined ? data.sources      : state.draftSources,
          draftProfileType:  data.profileType  !== undefined ? data.profileType  : state.draftProfileType,
          draftInputs:       data.inputs       !== undefined ? data.inputs       : state.draftInputs,
          draftIsStreaming:  data.isStreaming   !== undefined ? data.isStreaming  : state.draftIsStreaming,
        })),

      clearDraft: () =>
        set({
          draftTaxData: null,
          draftRagAnalysis: '',
          draftSources: [],
          draftProfileType: null,
          draftInputs: null,
          draftIsStreaming: false,
          activeSnapshotId: null,
        }),
    }),
    {
      name: 'profile-snapshots',
      storage: createJSONStorage(() => localStorage),
      // Only persist snapshots + active pointer; draft fields are in-memory only
      partialize: state => ({
        snapshots: state.snapshots,
        activeSnapshotId: state.activeSnapshotId,
      }),
    },
  ),
)
