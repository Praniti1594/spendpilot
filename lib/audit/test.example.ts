// Example: Test the improved audit engine locally
// Run this in your Node.js terminal or in lib/audit/test.ts

import { analyzeSpending, calculateTotals } from '@/lib/audit/engine'
import { SpendItem } from '@/lib/db/types'

// Scenario: Growing startup with redundant tools and overspending
const sampleItems: SpendItem[] = [
  {
    tool: 'chatgpt',
    plan: 'pro',
    monthlySpend: 120, // 6 people × $20 = should be $120, but they're paying $120 for 6 people
    seats: 6,
    teamUseCase: 'Research and content creation',
  },
  {
    tool: 'claude',
    plan: 'pro',
    monthlySpend: 100, // Also paying for Claude separately ($20 × 5 people)
    seats: 5,
    teamUseCase: 'Research',
  },
  {
    tool: 'github-copilot',
    plan: 'team',
    monthlySpend: 110, // $19 × 6 seats (engineering team)
    seats: 6,
    teamUseCase: 'Code generation',
  },
  {
    tool: 'cursor',
    plan: 'pro',
    monthlySpend: 120, // $20 × 6 seats (also code completion!)
    seats: 6,
    teamUseCase: 'Code generation',
  },
  {
    tool: 'figma',
    plan: 'team',
    monthlySpend: 800, // $160/month base + seats (design team of 5, includes some overspend)
    seats: 5,
    teamUseCase: 'Design',
  },
]

console.log('═══════════════════════════════════════════════════════════')
console.log('AUDIT ENGINE TEST - Realistic Startup Scenario')
console.log('═══════════════════════════════════════════════════════════\n')

console.log('INPUT: Company spending data')
console.log('─────────────────────────────')
sampleItems.forEach((item) => {
  const perSeat = item.monthlySpend / item.seats
  console.log(
    `${item.tool.padEnd(18)} | ${item.plan.padEnd(10)} | $${item.monthlySpend.toString().padEnd(6)} | ${item.seats} seats | $${perSeat.toFixed(2)}/person`
  )
})

const recommendations = analyzeSpending(sampleItems)
const totals = calculateTotals(sampleItems, recommendations)

console.log('\n═══════════════════════════════════════════════════════════')
console.log('RECOMMENDATIONS (Finance-Quality)')
console.log('═══════════════════════════════════════════════════════════\n')

if (recommendations.length === 0) {
  console.log('✅ No optimization opportunities found')
} else {
  recommendations.forEach((rec, i) => {
    console.log(`\n${i + 1}. ${rec.tool.toUpperCase()} → ${rec.issue}`)
    console.log(`   Issue: ${rec.issue}`)
    console.log(`   Action: ${rec.recommendation}`)
    console.log(`   💰 Potential Savings: $${rec.potentialSavings.toFixed(2)}/month`)

    if (rec.alternativeTools && rec.alternativeTools.length > 0) {
      console.log(`   Alternatives:`)
      rec.alternativeTools.forEach((alt) => {
        console.log(
          `     • ${alt.tool}: ${alt.reason} (est. $${alt.estimatedCost.toFixed(2)}/month)`
        )
      })
    }
  })
}

console.log('\n═══════════════════════════════════════════════════════════')
console.log('FINANCIAL SUMMARY')
console.log('═══════════════════════════════════════════════════════════\n')

console.log(`Current Monthly Spend:      $${totals.totalMonthlySpend.toFixed(2)}`)
console.log(`Total Monthly Savings:      $${totals.totalMonthlySavings.toFixed(2)}`)
console.log(`Monthly After Optimization: $${totals.totalMonthlyAfterSavings.toFixed(2)}`)
console.log(`Annual Savings:             $${totals.totalAnnualSavings.toFixed(2)}`)
console.log(`Savings Percentage:         ${totals.savingsPercentage.toFixed(1)}%`)

console.log('\n═══════════════════════════════════════════════════════════')
console.log('KEY INSIGHTS')
console.log('═══════════════════════════════════════════════════════════\n')

const redundancy = recommendations.filter(
  (r) =>
    r.issue.includes('Overlapping') || r.issue.includes('Duplicate')
)
const consolidation = redundancy.reduce((sum, r) => sum + r.potentialSavings, 0)

if (consolidation > 0) {
  console.log(`🎯 Consolidation Opportunity: $${consolidation.toFixed(2)}/month`)
  console.log('   Multiple tools in same category doing the same job.')
  console.log('   Quick win: Pick best-of-breed, kill duplicates.\n')
}

const enterprise = recommendations.filter(
  (r) => r.issue.includes('negotiation')
)
if (enterprise.length > 0) {
  const enterpriseSavings = enterprise.reduce((sum, r) => sum + r.potentialSavings, 0)
  console.log(`🏢 Enterprise Negotiation: $${enterpriseSavings.toFixed(2)}/month`)
  console.log('   At current spend level, negotiate volume discounts.\n')
}

console.log(
  `\n✨ This team could save $${totals.totalAnnualSavings.toFixed(0)}/year without\n   sacrificing capability or tool quality.`
)
