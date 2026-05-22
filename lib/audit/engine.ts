import { SpendItem, AuditRecommendation, AITool } from '@/lib/db/types'

// Market-based pricing data with realistic tiers
const TOOL_PRICING: Record<AITool, Record<string, number>> = {
  'chatgpt': {
    free: 0,
    pro: 20, // ChatGPT Plus
    team: 30, // per seat
    enterprise: 150, // approximate monthly base + per-seat
    custom: 0,
  },
  'claude': {
    free: 0,
    pro: 20, // Claude Pro
    team: 30, // Claude for work per seat
    enterprise: 150,
    custom: 0,
  },
  'cursor': {
    free: 0,
    pro: 20, // Cursor Pro
    team: 0,
    enterprise: 0,
    custom: 0,
  },
  'github-copilot': {
    free: 0,
    pro: 10, // Individual
    team: 19, // Business per seat
    enterprise: 0,
    custom: 0,
  },
  'gemini': {
    free: 0,
    pro: 20, // Gemini Advanced
    team: 0,
    enterprise: 0,
    custom: 0,
  },
  'perplexity': {
    free: 0,
    pro: 20, // Pro subscription
    team: 0,
    enterprise: 0,
    custom: 0,
  },
  'midjourney': {
    free: 0,
    pro: 10, // Basic
    team: 30, // Standard per seat
    enterprise: 0,
    custom: 0,
  },
  'other': {
    free: 0,
    pro: 0,
    team: 0,
    enterprise: 0,
    custom: 0,
  },
}

// Tool categories for consolidation logic
const TOOL_CATEGORIES: Record<AITool, string> = {
  'chatgpt': 'general-ai',
  'claude': 'general-ai',
  'gemini': 'general-ai',
  'perplexity': 'general-ai',
  'cursor': 'code-completion',
  'github-copilot': 'code-completion',
  'midjourney': 'image-generation',
  'other': 'other',
}

// Calculate expected cost based on plan and seats
function getExpectedCost(tool: AITool, plan: string, seats: number): number {
  const pricing = TOOL_PRICING[tool]?.[plan] || 0
  return pricing * seats
}

// Cost per person - useful for benchmarking
function getCostPerPerson(monthlySpend: number, seats: number): number {
  return seats > 0 ? monthlySpend / seats : 0
}

// Detect if organization is paying for unused seats
function isUnderUtilized(
  monthlySpend: number,
  seats: number,
  tool: AITool,
  plan: string
): boolean {
  const expectedCost = getExpectedCost(tool, plan, seats)
  const costPerPerson = getCostPerPerson(monthlySpend, seats)
  const expectedPerPerson = getCostPerPerson(expectedCost, seats)

  // If paying 2x or more per person than expected for the plan, likely overspending on seats
  return costPerPerson > expectedPerPerson * 2
}

// Calculate enterprise negotiation potential (more conservative)
function getEnterpriseNegotiationPotential(
  monthlySpend: number,
  seats: number
): { potential: number; recommendation: string } | null {
  // Enterprise deals usually kick in at $3k+ monthly spend or 20+ seats
  if (monthlySpend < 3000 && seats < 20) {
    return null
  }

  // Conservative: 15-20% discount (not 25-35%)
  // Most vendors won't discount beyond 20% without losing money
  const negotiationDiscount = monthlySpend > 8000 ? 0.2 : 0.15
  const potential = monthlySpend * negotiationDiscount

  return {
    potential,
    recommendation:
      seats >= 20
        ? `At ${seats} seats, you may qualify for enterprise pricing. Consider contacting sales about 15-20% volume discount potential.`
        : `Your spend of $${monthlySpend}/mo warrants a direct conversation with the vendor about volume pricing.`,
  }
}

// Detect redundant tools
function getRedundantTools(items: SpendItem[]): { tool1: AITool; tool2: AITool; category: string }[] {
  const byCategory: Record<string, AITool[]> = {}

  for (const item of items) {
    const category = TOOL_CATEGORIES[item.tool]
    if (!byCategory[category]) {
      byCategory[category] = []
    }
    byCategory[category].push(item.tool)
  }

  const redundant: { tool1: AITool; tool2: AITool; category: string }[] = []

  // Flag categories with multiple tools
  for (const [category, tools] of Object.entries(byCategory)) {
    if (tools.length > 1 && category !== 'other') {
      for (let i = 0; i < tools.length - 1; i++) {
        redundant.push({
          tool1: tools[i],
          tool2: tools[i + 1],
          category,
        })
      }
    }
  }

  return redundant
}

// Better overspending detection (more conservative)
function analyzeOverspending(
  tool: AITool,
  plan: string,
  monthlySpend: number,
  seats: number
): { isOverspending: boolean; reason: string; costPerSeat: number } {
  const expectedCost = getExpectedCost(tool, plan, seats)
  const costPerSeat = getCostPerPerson(monthlySpend, seats)
  const expectedPerSeat = getCostPerPerson(expectedCost, seats)

  // Enterprise plans get special treatment - don't flag as "overspending"
  // Instead, flag for review/negotiation (handled separately)
  if (plan === 'enterprise') {
    return {
      isOverspending: false,
      reason: '',
      costPerSeat,
    }
  }

  // Check 1: Only flag if paying 75%+ above market (not 50%)
  // This is much more conservative - avoids false positives
  if (costPerSeat > expectedPerSeat * 1.75) {
    const percentAbove = Math.round(((costPerSeat / expectedPerSeat - 1) * 100))
    return {
      isOverspending: true,
      reason: `Paying $${costPerSeat.toFixed(2)}/person/month—${percentAbove}% above typical market rates for this plan tier`,
      costPerSeat,
    }
  }

  return {
    isOverspending: false,
    reason: '',
    costPerSeat,
  }
}

// Detect extreme spend anomalies on non-enterprise plans
// Example: $200/month for ChatGPT Pro (expected $20) = 10x overspend
function detectSpendAnomaly(
  tool: AITool,
  monthlySpend: number,
  seats: number,
  plan: string
): { anomalyRatio: number; recommendation: string; savingsPotential: number } | null {
  // Skip if already at high volume pricing (enterprise would be handled separately)
  if (plan === 'enterprise') return null

  const expectedCost = getExpectedCost(tool, plan, seats)
  if (expectedCost === 0) return null // No pricing data

  const costPerSeat = getCostPerPerson(monthlySpend, seats)
  const expectedPerSeat = getCostPerPerson(expectedCost, seats)
  const anomalyRatio = costPerSeat / expectedPerSeat

  // Only flag if 5x or more above expected (extreme anomaly)
  if (anomalyRatio < 5) return null

  // This is an extreme anomaly. Likely causes:
  // - Duplicate billing (multiple subscriptions for same person)
  // - API charges on top of seat licenses
  // - Unmanaged subscriptions or legacy contracts
  // - Shared team account with individual seats also allocated

  // Conservative assumption: Bring down to 2x expected (account for legitimate complexity)
  // This leaves room for legitimate business need while cutting obvious waste
  const targetSpend = expectedPerSeat * seats * 2
  const potentialSavings = monthlySpend - targetSpend

  let recommendation = ''
  let confidence = 'medium'

  if (anomalyRatio >= 10) {
    // 10x+ is extreme - likely billing error
    recommendation = `Your spend of $${monthlySpend}/month for ${seats} ${seats === 1 ? 'seat' : 'seats'} is 10x+ typical rates ($${expectedPerSeat.toFixed(2)}/seat). This suggests duplicate billing, API charges layered on licenses, or legacy subscription overlap. Audit your account: consolidate duplicate subscriptions, verify API usage isn't auto-enabled, and reconcile with procurement records.`
  } else if (anomalyRatio >= 7) {
    // 7x-10x is very high
    recommendation = `Your spend of $${monthlySpend}/month for ${seats} ${seats === 1 ? 'seat' : 'seats'} is 7-10x typical rates. Review your billing: check for duplicate subscriptions, auto-enabled API charges, or overlapping seat + usage-based billing. Consolidate redundant charges with your account manager.`
  } else {
    // 5x-7x is high but perhaps legitimate for advanced features
    recommendation = `Your spend of $${monthlySpend}/month for ${seats} ${seats === 1 ? 'seat' : 'seats'} is 5-7x typical base rates. Review account setup: may include add-ons, API usage, or bundled services. Verify each charge aligns with your team's actual usage, then renegotiate or consolidate unnecessary services.`
  }

  return {
    anomalyRatio,
    recommendation,
    savingsPotential: potentialSavings,
  }
}

// Special analysis for enterprise plans - review and negotiation focused
function analyzeEnterpriseOptimization(
  tool: AITool,
  monthlySpend: number,
  seats: number,
  items: SpendItem[]
): { shouldReview: boolean; recommendation: string; savingsPotential: number } | null {
  // Only review enterprise plans that are substantial ($500+/month)
  if (monthlySpend < 500) {
    return null
  }

  const costPerSeat = getCostPerPerson(monthlySpend, seats)
  const expectedEnterpriseCost = TOOL_PRICING[tool]['enterprise'] * seats || 0

  // Enterprise review triggers (ordered by priority):

  // 1. Cost-per-seat significantly above market benchmarks (NEW - most specific)
  // This catches cases like $900/month for 3 seats when expected is $450
  if (expectedEnterpriseCost > 0) {
    const expectedCostPerSeat = getCostPerPerson(expectedEnterpriseCost, seats)
    const costRatio = costPerSeat / expectedCostPerSeat

    // If 20%+ above expected per-seat rate, recommend optimization review
    if (costRatio > 1.2) {
      const overagePercent = Math.round((costRatio - 1) * 100)
      const overage = monthlySpend - expectedEnterpriseCost

      // Tiered messaging based on severity
      let recommendation = ''
      let savingsPotential = 0

      if (costRatio >= 3) {
        // 3x+ is extreme - likely bundled with custom services or old contract
        recommendation = `Your cost per seat ($${costPerSeat.toFixed(2)}) is significantly above typical rates (${Math.round(costRatio)}x). This may reflect custom services, multi-year discounts, or consolidated contracts. Request a pricing review and benchmarking quote at your next renewal.`
        savingsPotential = monthlySpend * 0.15 // Conservative: 15% of total
      } else if (costRatio >= 2) {
        // 2x+ is material overage
        recommendation = `Your cost per seat ($${costPerSeat.toFixed(2)}) is ${overagePercent}% above typical enterprise rates. This suggests opportunity for renewal negotiation. Discuss volume discounts or better terms with your account manager.`
        savingsPotential = monthlySpend * 0.14 // Conservative: 14% of total
      } else {
        // 1.2x-2x is moderate overage
        recommendation = `Your cost per seat ($${costPerSeat.toFixed(2)}) is ${overagePercent}% above typical rates for your team size. Review your pricing terms at renewal—you may qualify for volume discounts or optimized pricing.`
        savingsPotential = monthlySpend * 0.12 // Conservative: 12% of total
      }

      return {
        shouldReview: true,
        recommendation,
        savingsPotential,
      }
    }
  }

  // 2. Very small team with enterprise (likely unnecessary overhead)
  if (seats < 3) {
    return {
      shouldReview: true,
      recommendation: `Your team of ${seats} is on an enterprise plan. Review whether enterprise controls (SSO, advanced auditing, compliance features) are actively used. If not essential, consider downgrading to a team plan.`,
      savingsPotential: monthlySpend * 0.35, // Conservative: 35% downgrade potential
    }
  }

  // 3. High spend warrants negotiation (contract renewal opportunity)
  if (monthlySpend > 1500) {
    return {
      shouldReview: true,
      recommendation: `Your enterprise spend of $${monthlySpend}/month qualifies for contract renegotiation. At renewal, contact vendor to discuss volume discounts or better terms.`,
      savingsPotential: monthlySpend * 0.12, // Conservative: 12% negotiation potential
    }
  }

  // 4. Multiple seats with enterprise features worth reviewing
  if (seats >= 5 && seats <= 15) {
    return {
      shouldReview: true,
      recommendation: `Review active usage of enterprise features (SSO, advanced analytics, compliance controls). These may not be essential for your team size. Cost-benefit analysis could reveal optimization opportunities.`,
      savingsPotential: monthlySpend * 0.08, // Conservative: 8% if features unused
    }
  }

  return null
}

// Find best-fit plan migration (more conservative)
function findBestPlan(
  tool: AITool,
  currentPlan: string,
  seats: number,
  monthlySpend: number
): { plan: string; monthlyCost: number; savings: number; reason: string } | null {
  const plans = ['free', 'pro', 'team', 'enterprise'] as const
  const currentIndex = plans.indexOf(currentPlan as any)

  let bestOption: { plan: string; monthlyCost: number; savings: number; reason: string } | null = null

  // Look for cheaper plans that fit the team size
  // Only recommend if 25%+ savings (not 15%) - higher bar to warrant switching friction
  for (let i = 0; i < currentIndex; i++) {
    const plan = plans[i]
    const cost = TOOL_PRICING[tool][plan] * seats
    const savings = monthlySpend - cost
    const savingsPercent = (savings / monthlySpend) * 100

    // Higher threshold: 25% savings needed
    if (cost > 0 && savingsPercent >= 25) {
      if (!bestOption || savings > bestOption.savings) {
        bestOption = {
          plan,
          monthlyCost: cost,
          savings,
          reason: `Downgrading to ${plan} plan maintains full functionality with ${savingsPercent.toFixed(0)}% cost reduction`,
        }
      }
    }
  }

  return bestOption
}

// Suggest consolidation if multiple tools in same category
function getSuggestedConsolidation(
  items: SpendItem[]
): { consolidate: AITool[]; save: number; reason: string } | null {
  const redundant = getRedundantTools(items)

  if (redundant.length === 0) {
    return null
  }

  // Find the redundancy with highest cost to consolidate
  let bestConsolidation: {
    items: SpendItem[]
    spend: number
    category: string
  } | null = null

  for (const redundancy of redundant) {
    const relevantItems = items.filter(
      (i) => TOOL_CATEGORIES[i.tool] === redundancy.category
    )

    const totalSpend = relevantItems.reduce((sum, i) => sum + i.monthlySpend, 0)

    // Keep only the most efficient tool
    const cheapest = relevantItems.reduce((min, curr) =>
      getCostPerPerson(curr.monthlySpend, curr.seats) <
      getCostPerPerson(min.monthlySpend, min.seats)
        ? curr
        : min
    )

    const otherSpend = totalSpend - cheapest.monthlySpend

    if (!bestConsolidation || otherSpend > bestConsolidation.spend) {
      bestConsolidation = {
        items: relevantItems.filter((i) => i.tool !== cheapest.tool),
        spend: otherSpend,
        category: redundancy.category,
      }
    }
  }

  if (bestConsolidation && bestConsolidation.spend > 0) {
    const consolidatedTools = bestConsolidation.items.map((i) => i.tool).join(' + ')
    return {
      consolidate: bestConsolidation.items.map((i) => i.tool),
      save: bestConsolidation.spend,
      reason: `Consolidate ${bestConsolidation.category} tools—eliminate ${consolidatedTools}`,
    }
  }

  return null
}

// Get better alternative suggestions with reasoning (conservative)
function getBetterAlternatives(
  tool: AITool,
  useCase: string,
  monthlySpend: number
): { tool: AITool; reason: string; estimatedCost: number; savings: number }[] {
  const alternatives: Record<AITool, AITool[]> = {
    'chatgpt': ['claude'], // Only Claude - genuine alternative
    'claude': ['chatgpt'], // Only ChatGPT
    'gemini': [], // Rarely a direct replacement
    'perplexity': [], // Niche - not a general replacement
    'cursor': ['github-copilot'],
    'github-copilot': ['cursor'],
    'midjourney': [],
    'other': [],
  }

  const altTools = alternatives[tool] || []

  return altTools
    .map((altTool) => {
      const estimatedCost = TOOL_PRICING[altTool].pro || 20
      const savings = monthlySpend - estimatedCost
      return {
        tool: altTool,
        reason: getBetterAlternativeReason(tool, altTool, useCase),
        estimatedCost,
        savings,
      }
    })
    .filter((alt) => alt.savings > 10) // Only if $10+ savings (high bar)
    .slice(0, 1) // Only suggest ONE alternative (not 2)
}

// Context-aware alternative reasoning (more cautious)
function getBetterAlternativeReason(
  current: AITool,
  alternative: AITool,
  useCase: string
): string {
  const codeUseCase = useCase.toLowerCase().includes('code') ||
    useCase.toLowerCase().includes('dev') ||
    useCase.toLowerCase().includes('engineer')

  if (current === 'chatgpt' && alternative === 'claude') {
    return codeUseCase
      ? 'Claude is competitive for code tasks. Switching has team retraining cost.'
      : 'Claude offers comparable reasoning. Switching incurs team adjustment friction.'
  }
  if (current === 'claude' && alternative === 'chatgpt') {
    return 'ChatGPT ecosystem has more integrations. May reduce switching friction vs other tools.'
  }
  if (current === 'cursor' && alternative === 'github-copilot') {
    return 'GitHub Copilot offers native VS Code integration at lower cost. Cursor offers better chat interface—evaluate your team\'s primary need.'
  }
  if (current === 'github-copilot' && alternative === 'cursor') {
    return 'Cursor provides better integrated chat experience. Switching cost includes IDE adjustment.'
  }

  return 'May offer comparable functionality at lower cost, but evaluate switching friction.'
}


// Main audit engine - produces finance-quality recommendations (conservative)
export function analyzeSpending(items: SpendItem[]): AuditRecommendation[] {
  const recommendations: AuditRecommendation[] = []

  // Check 1: Tool consolidation opportunities (highest confidence)
  const consolidation = getSuggestedConsolidation(items)
  if (consolidation && consolidation.save > 30) {
    // Only flag if savings > $30/month (higher bar)
    recommendations.push({
      tool: consolidation.consolidate[0],
      currentPlan: 'custom',
      currentMonthlySpend: consolidation.save,
      issue: `Overlapping ${TOOL_CATEGORIES[consolidation.consolidate[0]]} tools`,
      recommendation: `You're currently paying for multiple tools in the same category. Consider consolidating to your highest-value tool and canceling the others. This would eliminate duplicate subscriptions while maintaining full capability.`,
      potentialSavings: consolidation.save * 0.9, // Conservative: 90% of estimated (10% friction buffer)
      confidence: 'high',
      category: 'consolidation',
      alternativeTools: [],
    })
  }

  // Check 2: Enterprise plans get special review treatment
  for (const item of items) {
    if (item.plan === 'enterprise') {
      const enterpriseReview = analyzeEnterpriseOptimization(item.tool, item.monthlySpend, item.seats, items)

      if (enterpriseReview) {
        recommendations.push({
          tool: item.tool,
          currentPlan: item.plan,
          currentMonthlySpend: item.monthlySpend,
          issue: 'Enterprise plan review recommended',
          recommendation: enterpriseReview.recommendation,
          potentialSavings: enterpriseReview.savingsPotential * 0.7, // Very conservative: 70% of potential
          confidence: 'medium',
          category: 'negotiation',
          alternativeTools: [],
        })
      }

      // Only very rarely downgrade enterprise → team/pro
      // Criteria: Must be 1-2 person team with $800+ monthly spend on enterprise
      // AND not using any enterprise features
      if (item.seats <= 2 && item.monthlySpend > 800) {
        // This is an EXTREME case - enterprise plan on 1-2 people is almost always wrong
        const teamPlanCost = TOOL_PRICING[item.tool]['team'] * item.seats || 0
        if (teamPlanCost > 0 && teamPlanCost < item.monthlySpend * 0.5) {
          recommendations.push({
            tool: item.tool,
            currentPlan: item.plan,
            currentMonthlySpend: item.monthlySpend,
            issue: 'Enterprise plan likely inappropriate for team size',
            recommendation: `Your team of ${item.seats} is on an enterprise plan. This is unusual. If your team doesn't actively use enterprise-specific features (SSO, advanced security, audit controls), consider downgrading to a team or pro plan to reduce costs.`,
            potentialSavings: (item.monthlySpend - teamPlanCost) * 0.6, // Very conservative: 60% realization
            confidence: 'low',
            category: 'downgrade',
            alternativeTools: [],
          })
        }
      }

      continue // Skip to next item, don't process non-enterprise logic
    }
  }

  // Check 3: Individual tool optimization (non-enterprise)
  let optimizedCount = 0
  for (const item of items) {
    // Skip enterprise - already handled above
    if (item.plan === 'enterprise') {
      continue
    }

    const { isOverspending, reason, costPerSeat } = analyzeOverspending(
      item.tool,
      item.plan,
      item.monthlySpend,
      item.seats
    )

    if (isOverspending) {
      // Check enterprise negotiation first (for non-enterprise plans at scale)
      const enterprise = getEnterpriseNegotiationPotential(item.monthlySpend, item.seats)

      if (enterprise) {
        recommendations.push({
          tool: item.tool,
          currentPlan: item.plan,
          currentMonthlySpend: item.monthlySpend,
          issue: `Potential enterprise pricing opportunity`,
          recommendation: `${enterprise.recommendation} This would require vendor negotiation but may yield meaningful savings.`,
          potentialSavings: enterprise.potential * 0.75, // Very conservative (25% friction buffer)
          confidence: 'medium',
          category: 'negotiation',
          alternativeTools: [],
        })
      } else {
        // Check for plan downgrades
        const betterPlan = findBestPlan(item.tool, item.plan, item.seats, item.monthlySpend)

        if (betterPlan) {
          recommendations.push({
            tool: item.tool,
            currentPlan: item.plan,
            currentMonthlySpend: item.monthlySpend,
            issue: `Current plan may exceed team requirements`,
            recommendation: `Your team could shift from the ${item.plan} plan to ${betterPlan.plan} tier without losing essential capabilities. Estimated monthly savings: $${betterPlan.savings.toFixed(2)}.`,
            potentialSavings: betterPlan.savings * 0.85, // Conservative: 85% realization rate
            confidence: 'high',
            category: 'downgrade',
            alternativeTools: [],
          })
        } else {
          // Check for extreme spend anomaly (5x+ expected cost)
          const anomaly = detectSpendAnomaly(
            item.tool,
            item.monthlySpend,
            item.seats,
            item.plan
          )

          if (anomaly) {
            // Extreme anomaly - recommend spend audit instead of marking as optimized
            recommendations.push({
              tool: item.tool,
              currentPlan: item.plan,
              currentMonthlySpend: item.monthlySpend,
              issue: `Unusually high spend detected`,
              recommendation: anomaly.recommendation,
              potentialSavings: anomaly.savingsPotential * 0.65, // Conservative: 65% realization (billing issues can be complex)
              confidence: 'medium',
              category: 'negotiation',
              alternativeTools: [],
            })
          } else {
            optimizedCount++
          }
        }
      }
    } else {
      // No overspending detected - check for alternatives (lowest priority)
      const alternatives = getBetterAlternatives(item.tool, item.teamUseCase, item.monthlySpend)

      if (alternatives.length > 0) {
        const best = alternatives[0]

        // Only recommend if substantial savings AND not risky
        if (best.savings > 15 && !isTooRiskyToSwitch(item.tool)) {
          recommendations.push({
            tool: item.tool,
            currentPlan: item.plan,
            currentMonthlySpend: item.monthlySpend,
            issue: `Alternative tool may better match your needs`,
            recommendation: `${best.reason} Your team would need to evaluate fit and manage the transition. Potential monthly savings: $${best.savings.toFixed(2)}.`,
            potentialSavings: best.savings * 0.5, // Very conservative: 50% realization (high switching friction)
            confidence: 'low',
            category: 'alternative',
            alternativeTools: alternatives.map((alt) => ({
              tool: alt.tool,
              reason: alt.reason,
              estimatedCost: alt.estimatedCost,
            })),
          })
        } else {
          optimizedCount++
        }
      } else {
        optimizedCount++
      }
    }
  }

  // Add "already optimized" recommendation if most tools are already good
  if (optimizedCount >= items.length * 0.6) {
    // 60%+ of tools are already optimized
    recommendations.push({
      tool: 'other',
      currentPlan: 'custom',
      currentMonthlySpend: 0,
      issue: 'Spend appears well-optimized',
      recommendation: `Your organization already has a thoughtful tool mix. Most spending aligns with market rates for your team size. Focus on adoption, consolidation of unused seats, and periodic re-evaluation.`,
      potentialSavings: 0,
      confidence: 'high',
      category: 'no-action',
      alternativeTools: [],
    })
  }

  // Only return recommendations with meaningful savings (filter out noise)
  return recommendations.filter(
    (r) => r.potentialSavings > 0 || r.category === 'no-action'
  )
}

// Check if switching is too risky (keep incumbent even if costs more)
function isTooRiskyToSwitch(tool: AITool): boolean {
  // Don't recommend switching FROM these tools - too entrenched/risky
  const tooRiskyToSwitch = ['slack', 'github', 'jira']
  return tooRiskyToSwitch.includes(tool)
}

// Calculate totals
export function calculateTotals(
  items: SpendItem[],
  recommendations: AuditRecommendation[]
) {
  const totalMonthlySpend = items.reduce((sum, item) => sum + item.monthlySpend, 0)
  const totalMonthlySavings = recommendations.reduce(
    (sum, rec) => sum + rec.potentialSavings,
    0
  )
  const totalMonthlyAfterSavings = totalMonthlySpend - totalMonthlySavings
  const savingsPercentage = totalMonthlySpend > 0 
    ? Math.round((totalMonthlySavings / totalMonthlySpend) * 100 * 100) / 100
    : 0

  return {
    totalMonthlySpend: Math.round(totalMonthlySpend * 100) / 100,
    totalMonthlySavings: Math.round(totalMonthlySavings * 100) / 100,
    totalMonthlyAfterSavings: Math.round(totalMonthlyAfterSavings * 100) / 100,
    totalAnnualSavings: Math.round(totalMonthlySavings * 12 * 100) / 100,
    savingsPercentage,
  }
}
