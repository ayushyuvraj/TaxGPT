// API Response Types
export interface HealthResponse {
  status: string
  index_ready: boolean
  provider: string
  vector_count: number
}

export interface ChatMessage {
  question: string
  answer: string
  sources?: Source[]
}

export interface Source {
  source: string
  section?: string
  text?: string
}

export interface QAResponse {
  answer: string
  error: boolean
  sources: Source[]
  filtered: boolean
}

export interface MapperRequest {
  section: string
}

export interface SectionResult {
  found: true
  type: 'section'
  old_section: string
  new_section: string
  title_old: string
  title_new: string
  change_summary: string
  category: string
}

export interface ConceptResult {
  found: true
  type: 'concept'
  old_concept: string
  new_concept: string
  new_section: string
  change_summary: string
  impact: string
}

export interface FormResult {
  found: true
  type: 'form'
  old_form: string
  new_form: string
  purpose: string
  status: string
}

export interface NotFoundResult {
  found: false
  old_section: string
}

export type MapperResponse = SectionResult | ConceptResult | FormResult | NotFoundResult

export interface MapperStatsResponse {
  total_old_to_new: number
  total_concepts: number
  total_forms: number
}

// Flat entry used for client-side search in Compare Acts mapper mode
export type MappingEntry =
  | (SectionResult & { key: string })
  | (ConceptResult & { key: string })
  | (FormResult & { key: string })

export interface AllMappingsResponse {
  old_to_new: Record<string, Omit<SectionResult, 'found' | 'type'> & { new_sections?: string[] }>
  concepts: Record<string, Omit<ConceptResult, 'found' | 'type'>>
  forms: Record<string, Omit<FormResult, 'found' | 'type'>>
}

export interface ProfileItem {
  id: string
  label: string
}

export interface ProfileListResponse {
  profiles: ProfileItem[]
}

export interface ProfileResponse {
  profile: string
  label: string
  analysis: string
  source: string
  error: boolean
}

export interface NoticeMetadata {
  notice_type?: string
  sections: string[]
  dates: string[]
  severity?: string
}

export interface NoticeResponse {
  analysis: string
  source: string
  error: boolean
  metadata?: NoticeMetadata
}

export interface IngestionStatusResponse {
  status: string
  progress_pct: number
  message: string
  log_tail: string[]
  started_at?: string
  completed_at?: string
}

// ── GenNext types ─────────────────────────────────────────────────────────────

export interface GenNextChatMessage {
  question: string
  answer: string
  sources?: Source[]
  timestamp: number
  usedDocument?: string  // filename if this answer was generated with a document
}

export interface DocumentUploadResponse {
  filename: string
  extracted_text: string
  page_count: number
  char_count: number
  truncated: boolean
  error: string | null
  success: boolean
  is_invoice_likely: boolean
  format_type: string
  is_tax_related: boolean
  validation_message: string | null
}

export interface ActiveDocument {
  filename: string
  extractedText: string
  truncated: boolean
  isInvoice: boolean
  formatType: string
}

// ── Tax Computation types ─────────────────────────────────────────────────────

export interface SlabEntry {
  range_label: string
  rate_pct: number
  income_in_slab: number
  tax_on_slab: number
}

export interface RegimeResult {
  regime: string
  gross_income: number
  deductions: Record<string, number>
  taxable_income: number
  slabs: SlabEntry[]
  slab_tax: number
  rebate: number
  surcharge: number
  cess: number
  total_tax: number
  effective_rate_pct: number
  notes: string[]
}

export interface SavingsOpportunity {
  name: string
  section: string
  description: string
  potential_saving: number
  current_utilization: number
  max_amount: number
  effort: 'Zero' | 'Low' | 'Medium' | 'High'
  applicable: boolean
}

export interface Deadline {
  date_str: string
  label: string
  detail: string
  section: string
  deadline_type: 'filing' | 'payment' | 'investment' | 'transition'
  days_away: number
  amount_hint?: number
}

export interface TaxComputationResponse {
  profile_type: string
  gross_income: number
  new_regime: RegimeResult
  old_regime: RegimeResult
  winner: 'new' | 'old'
  winner_saving: number
  savings_opportunities: SavingsOpportunity[]
  deadlines: Deadline[]
}

// ── Profile inputs (moved here from useProfile.ts so store can import without circular dep) ──

export interface ProfileInputsData {
  gross_income?: number
  hra_city?: string
  tax_regime?: string
  turnover?: number
  entity_type?: string
  asset_types?: string[]
  ltcg?: number
  residence_country?: string
  india_income_type?: string
  annual_income?: number
  main_expense?: string
}

// ── Tax Health Score ──────────────────────────────────────────────────────────

export type TaxGrade = 'A+' | 'A' | 'B+' | 'B' | 'C' | 'D'
export type TaxGradeLabel = 'Tax Ready' | 'Well Optimized' | 'Good Shape' | 'Room to Improve' | 'Action Needed' | 'Needs Attention'
export type TaxGradeColor = 'emerald' | 'green' | 'blue' | 'indigo' | 'amber' | 'red'

export interface TaxHealthBreakdown {
  total: number              // 0–100, clamped
  regime: number             // 0–25
  deductions: number         // 0–40
  compliance: number         // 0–25
  filingReadiness: number    // 0–10
  grade: TaxGrade
  gradeLabel: TaxGradeLabel
  gradeColor: TaxGradeColor
  nextAction: string
}

// ── Saved Profile Snapshot ────────────────────────────────────────────────────

export interface ProfileSnapshot {
  id: string
  name: string
  profileType: 'salaried' | 'business' | 'investor' | 'nri' | 'freelancer'
  inputs: ProfileInputsData
  taxData: TaxComputationResponse
  ragAnalysis: string
  sources: Source[]
  createdAt: string                  // ISO 8601
  completedActionNames: string[]
  taxHealthScore: number
  taxHealthBreakdown: TaxHealthBreakdown
  notes: string
}
