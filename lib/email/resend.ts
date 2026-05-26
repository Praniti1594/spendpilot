import { Resend } from 'resend'
import { AuditResult } from '@/lib/db/types'

// Initialize Resend only if API key exists (safe - deferred initialization)
let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) {
    return null
  }
  if (!resendClient) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

interface LeadEmailParams {
  email: string
  companyName?: string
  roleTitle?: string
  monthlySavings: number
  annualSavings: number
  summary?: string
}

/**
 * Send confirmation email to captured lead
 * Includes estimated savings and audit summary
 */
export async function sendLeadConfirmationEmail(params: LeadEmailParams): Promise<{ success: boolean; error?: string }> {
  const resend = getResendClient()

  if (!resend) {
    console.warn('RESEND_API_KEY not set, skipping email')
    return { success: false, error: 'Email service not configured' }
  }

  try {
    const { email, companyName, roleTitle, monthlySavings, annualSavings, summary } = params

    const emailHtml = buildConfirmationEmail({
      companyName,
      roleTitle,
      monthlySavings,
      annualSavings,
      summary,
    })

    const response = await resend.emails.send({
      from: 'SpendPilot <onboarding@resend.dev>',
      to: email,
      subject: `Your AI Spend Audit Results – $${Math.round(annualSavings)}/year in savings`,
      html: emailHtml,
    })

    if (response.error) {
      console.error('Resend error:', response.error)
      return { success: false, error: 'Failed to send email' }
    }

    return { success: true }
  } catch (error) {
    console.error('Email send error:', error)
    return { success: false, error: 'Email service error' }
  }
}

/**
 * Build professional email HTML
 * Minimal design, founder-friendly tone
 */
function buildConfirmationEmail(params: {
  companyName?: string
  roleTitle?: string
  monthlySavings: number
  annualSavings: number
  summary?: string
}): string {
  const { companyName, roleTitle, monthlySavings, annualSavings, summary } = params

  const greeting = companyName ? `at ${companyName}` : 'at your company'

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; line-height: 1.6; color: #333; }
      .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
      .header { margin-bottom: 30px; }
      .header h1 { font-size: 24px; font-weight: 700; margin: 0 0 10px 0; color: #1f2937; }
      .header p { margin: 0; color: #6b7280; font-size: 14px; }
      .savings-card { background: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 24px; margin: 24px 0; text-align: center; }
      .savings-card .amount { font-size: 36px; font-weight: 700; color: #2563eb; margin: 0; }
      .savings-card .label { font-size: 14px; color: #6b7280; margin-top: 8px; }
      .summary-section { background: #f9fafb; border-left: 4px solid #2563eb; padding: 16px; margin: 24px 0; border-radius: 4px; }
      .summary-section p { margin: 0; font-size: 14px; color: #374151; }
      .cta { margin: 32px 0; text-align: center; }
      .cta a { background: #2563eb; color: white; padding: 12px 32px; border-radius: 6px; text-decoration: none; font-weight: 600; display: inline-block; }
      .footer { border-top: 1px solid #e5e7eb; margin-top: 32px; padding-top: 24px; font-size: 12px; color: #9ca3af; }
      .footer p { margin: 4px 0; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <h1>Your AI Spend Audit is Ready</h1>
        <p>We've analyzed your AI tool spending and found significant optimization opportunities.</p>
      </div>

      <div class="savings-card">
        <div class="amount">$${Math.round(annualSavings)}</div>
        <div class="label">Potential annual savings</div>
        <div class="label" style="margin-top: 4px;">$${Math.round(monthlySavings)}/month</div>
      </div>

      ${summary ? `
      <div class="summary-section">
        <p><strong>Your Analysis:</strong></p>
        <p style="margin-top: 12px;">${summary}</p>
      </div>
      ` : ''}

      <div class="cta">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://spendpilot.dev'}">View Full Results</a>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 14px; color: #6b7280;">
        We'll notify you when new optimization opportunities are identified for your team${roleTitle ? ` (${roleTitle}${greeting ? ' ' + greeting : ''})` : ''}.
      </p>

      <div class="footer">
        <p><strong>SpendPilot</strong></p>
        <p>AI-powered spend optimization for your team</p>
        <p style="margin-top: 12px;"><em>You're receiving this because you ran an AI spend audit on SpendPilot.</em></p>
      </div>
    </div>
  </body>
</html>
  `.trim()
}
