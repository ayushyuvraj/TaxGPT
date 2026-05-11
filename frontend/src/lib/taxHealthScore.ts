import type {
  TaxComputationResponse,
  TaxHealthBreakdown,
  TaxGrade,
  TaxGradeLabel,
  TaxGradeColor,
} from './types'

const GRADES: { min: number; grade: TaxGrade; label: TaxGradeLabel; color: TaxGradeColor }[] = [
  { min: 90, grade: 'A+', label: 'Tax Ready',        color: 'emerald' },
  { min: 75, grade: 'A',  label: 'Well Optimized',   color: 'green'   },
  { min: 60, grade: 'B+', label: 'Good Shape',        color: 'blue'    },
  { min: 50, grade: 'B',  label: 'Room to Improve',  color: 'indigo'  },
  { min: 35, grade: 'C',  label: 'Action Needed',    color: 'amber'   },
  { min: 0,  grade: 'D',  label: 'Needs Attention',  color: 'red'     },
]

function fmt(n: number): string {
  return n >= 100_000
    ? `₹${(n / 100_000).toFixed(1)}L`
    : `₹${n.toLocaleString('en-IN')}`
}

export function computeTaxHealthScore(
  taxData: TaxComputationResponse,
  completedActionNames: string[],
  profileType: string,
  submittedRegime?: string,
): TaxHealthBreakdown {
  // 1. Regime score (25 pts)
  // If we know what regime they submitted, check against winner. Otherwise award full 25
  // as awareness credit (they've seen the comparison).
  const regimeScore = submittedRegime
    ? (submittedRegime === taxData.winner ? 25 : 0)
    : 25

  // 2. Deduction utilisation (40 pts)
  const applicable = taxData.savings_opportunities.filter(
    o => o.applicable && o.potential_saving > 0,
  )
  let deductionScore = 0
  if (applicable.length === 0) {
    deductionScore = 40
  } else {
    const done = applicable.filter(
      o => o.effort === 'Zero' || completedActionNames.includes(o.name),
    ).length
    deductionScore = Math.round((done / applicable.length) * 40)
  }

  // 3. Compliance score (25 pts)
  const overdue = taxData.deadlines.filter(d => d.days_away < 0).length
  const complianceScore = Math.max(0, 25 - overdue * 7)

  // 4. Filing readiness (10 pts)
  const filingScore =
    profileType === 'salaried' || profileType === 'investor' ? 10 : 5

  const total = Math.min(100, Math.max(0, regimeScore + deductionScore + complianceScore + filingScore))

  const gradeEntry = GRADES.find(g => total >= g.min)!

  // Next best action
  const incomplete = applicable
    .filter(o => o.effort !== 'Zero' && !completedActionNames.includes(o.name))
    .sort((a, b) => b.potential_saving - a.potential_saving)

  let nextAction: string
  if (incomplete[0]) {
    nextAction = `${incomplete[0].name} — save ${fmt(incomplete[0].potential_saving)}`
  } else if (overdue > 0) {
    nextAction = 'File overdue compliance items'
  } else if (submittedRegime && submittedRegime !== taxData.winner) {
    nextAction = `Switch to ${taxData.winner === 'new' ? 'New' : 'Old'} Regime — save ${fmt(taxData.winner_saving)}`
  } else {
    nextAction = 'Review regime choice each April'
  }

  return {
    total,
    regime: regimeScore,
    deductions: deductionScore,
    compliance: complianceScore,
    filingReadiness: filingScore,
    grade: gradeEntry.grade,
    gradeLabel: gradeEntry.label,
    gradeColor: gradeEntry.color,
    nextAction,
  }
}
