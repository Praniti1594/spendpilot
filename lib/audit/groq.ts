import { Groq } from 'groq-sdk'
import { AuditResult } from '@/lib/db/types'

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
})

export async function generateAuditSummary(audit: AuditResult): Promise<string> {
  const prompt = buildSummaryPrompt(audit)

  try {
    const message = await groq.chat.completions.create({
      model: 'llama-3-70b-versatile',
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    if (message.choices[0].message.content) {
      return message.choices[0].message.content
    }

    return 'Unable to generate summary'
  } catch (error) {
    console.error('Groq API error:', error)
    throw new Error('Failed to generate summary')
  }
}

function buildSummaryPrompt(audit: AuditResult): string {
  const toolsList = audit.items.map((item) => `${item.tool}: $${item.monthlySpend}/mo (${item.seats} seats)`).join('\n')

  const recommendationsSummary = audit.recommendations
    .map((rec) => `- ${rec.tool}: ${rec.issue}. Potential savings: $${rec.potentialSavings}/mo`)
    .join('\n')

  return `You are a financial advisor specializing in AI tool spending optimization.

A company has shared their AI tool spending:
${toolsList}

Total Monthly Spend: $${audit.totalMonthlySpend}/month
Total Annual Spend: $${audit.totalMonthlySpend * 12}/year

Key Recommendations:
${recommendationsSummary}

Potential Monthly Savings: $${audit.totalMonthlySavings} (${audit.savingsPercentage}%)
Potential Annual Savings: $${audit.totalAnnualSavings}

Write a brief (2-3 sentences), professional, and actionable executive summary that:
1. Acknowledges their current spending
2. Highlights the biggest opportunity for savings
3. Provides one specific next step

Be concise and encouraging. Use professional but friendly language.`
}
