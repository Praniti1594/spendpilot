import { Groq } from 'groq-sdk'
import { AuditResult } from '@/lib/db/types'

// PROMPTS.md - Keep these modular for easy updates
const SUMMARY_SYSTEM_PROMPT = `You are a financial advisor specializing in AI tool spending optimization. Your tone should be:
- Financially literate but accessible
- Operational and actionable
- Concise and direct
- Founder-friendly (speak to decision makers)`

const SUMMARY_USER_PROMPT_TEMPLATE = (audit: AuditResult): string => {
  const toolsList = audit.items
    .map((item) => `• ${item.tool}: $${item.monthlySpend}/mo (${item.seats} seats)`)
    .join('\n')

  const topRecommendations = audit.recommendations
    .sort((a, b) => b.potentialSavings - a.potentialSavings)
    .slice(0, 3)
    .map((rec) => `• ${rec.tool}: ${rec.issue}. Savings: $${rec.potentialSavings}/mo`)
    .join('\n')

  return `Current AI Tool Spend:
${toolsList}

Monthly Total: $${audit.totalMonthlySpend} | Annual: $${(audit.totalMonthlySpend * 12).toFixed(0)}

Top Optimization Opportunities:
${topRecommendations}

Potential Savings: $${audit.totalMonthlySavings}/mo ($${audit.totalAnnualSavings.toFixed(0)}/year) = ${audit.savingsPercentage.toFixed(1)}% reduction

Write a brief 2-3 sentence executive summary that:
1. States their current spend and the optimization opportunity
2. Highlights the #1 priority action
3. Shows confidence in the recommendation

Keep it professional, founder-friendly, and actionable. Max 120 words.`
}

// Safe text cleaning: truncate long recommendation excerpts at word boundaries
function cleanRecommendationText(text: string, maxLength: number = 75): string {
  if (!text || text.length === 0) {
    return 'optimize your AI tool stack'
  }

  // Extract first sentence
  const firstSentence = text.split('.')[0].trim()

  // If already short enough, use it
  if (firstSentence.length <= maxLength) {
    return firstSentence
  }

  // Truncate at word boundary
  const truncated = firstSentence.substring(0, maxLength)
  const lastSpaceIndex = truncated.lastIndexOf(' ')

  if (lastSpaceIndex > 0) {
    return truncated.substring(0, lastSpaceIndex).trim()
  }

  return truncated.trim()
}

// Fallback templated summary (deterministic, no AI needed)
function generateFallbackSummary(audit: AuditResult): string {
  const topRec = audit.recommendations.sort((a, b) => b.potentialSavings - a.potentialSavings)[0]

  // Well-optimized case - no major opportunities
  if (!topRec) {
    return `Your company's AI spending of $${audit.totalMonthlySpend}/month demonstrates good optimization discipline. Conduct a quarterly review to ensure tools remain aligned with evolving team needs.`
  }

  // Extract safe recommendation text
  const recommendationAction = cleanRecommendationText(topRec.recommendation)

  // Format currency cleanly
  const monthlyAmount = Math.round(topRec.potentialSavings)
  const annualAmount = Math.round(topRec.potentialSavings * 12)

  // Build natural, founder-friendly summary
  return `Your AI tooling costs $${audit.totalMonthlySpend}/month. Focus on this: ${recommendationAction.toLowerCase()}. That's $${monthlyAmount}/month in potential savings ($${annualAmount}/year). Prioritize action this quarter to capture these gains.`
}

// Initialize Groq with safe API key handling
let groqClient: Groq | null = null

function getGroqClient(): Groq {
  if (!groqClient) {
    if (!process.env.GROQ_API_KEY) {
      throw new Error('GROQ_API_KEY environment variable is not set')
    }
    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    })
  }
  return groqClient
}

export async function generateAuditSummary(audit: AuditResult): Promise<string> {
  // Graceful fallback if no API key
  if (!process.env.GROQ_API_KEY) {
    console.warn('GROQ_API_KEY not set, using fallback summary')
    return generateFallbackSummary(audit)
  }

  try {
    const groq = getGroqClient()
    const userPrompt = SUMMARY_USER_PROMPT_TEMPLATE(audit)

    const message = await groq.chat.completions.create({
      // Mixtral 8x7B: Fast, reliable, excellent for short summaries
      // Optimized latency for real-time UX, stable free-tier access
      model: 'llama-3.1-8b-instant',
      max_tokens: 250,
      temperature: 0.7,
      messages: [
        {
          role: 'system',
          content: SUMMARY_SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    })

    const content = message.choices[0]?.message?.content
    if (content) {
      return content.trim()
    }

    return generateFallbackSummary(audit)
  } catch (error) {
    console.error('Groq API error:', error)
    // Fallback to deterministic summary on error
    return generateFallbackSummary(audit)
  }
}
