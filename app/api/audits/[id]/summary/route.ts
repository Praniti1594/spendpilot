import { NextRequest, NextResponse } from 'next/server'
import { initSupabaseAdmin } from '@/lib/db/supabase'
import { generateAuditSummary } from '@/lib/audit/groq'
import { AuditRecord, AuditResult } from '@/lib/db/types'

/**
 * POST /api/audits/[id]/summary
 * Generates and saves AI-powered audit summary for an existing audit
 * Gracefully falls back to templated summary if AI fails
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Audit ID is required' },
        { status: 400 }
      )
    }

    const supabaseAdmin = initSupabaseAdmin()

    // Fetch the audit
    const { data: audit, error: fetchError } = await supabaseAdmin
      .from('audits')
      .select('*')
      .eq('id', id)
      .single()

    if (fetchError || !audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      )
    }

    // Transform to AuditResult for generateAuditSummary
    const auditResult: AuditResult = {
      id: audit.id,
      createdAt: audit.created_at,
      items: audit.items,
      recommendations: audit.recommendations,
      totalMonthlySpend: audit.total_monthly_spend,
      totalMonthlyAfterSavings: audit.total_monthly_after_savings,
      totalMonthlySavings: audit.total_monthly_savings,
      totalAnnualSavings: audit.total_annual_savings,
      savingsPercentage: audit.savings_percentage,
      summary: audit.summary,
      isPublic: audit.is_public,
    }

    // Generate summary (with fallback if AI fails)
    const summary = await generateAuditSummary(auditResult)

    // Save summary back to Supabase
    const { data: updated, error: updateError } = await supabaseAdmin
      .from('audits')
      .update({ summary })
      .eq('id', id)
      .select()
      .single()

    if (updateError || !updated) {
      console.error('Failed to save summary:', updateError)
      // Even if save fails, return the summary that was generated
      // (user can still see it on frontend, just not persisted)
      return NextResponse.json(
        {
          id,
          summary,
          message: 'Summary generated but could not be persisted',
        },
        { status: 200 }
      )
    }

    // Return updated audit with summary
    return NextResponse.json(transformRecord(updated))
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
}

/**
 * Transform Supabase record to AuditResult
 */
function transformRecord(record: AuditRecord): AuditResult {
  return {
    id: record.id,
    createdAt: record.created_at,
    items: record.items,
    recommendations: record.recommendations,
    totalMonthlySpend: record.total_monthly_spend,
    totalMonthlyAfterSavings: record.total_monthly_after_savings,
    totalMonthlySavings: record.total_monthly_savings,
    totalAnnualSavings: record.total_annual_savings,
    savingsPercentage: record.savings_percentage,
    summary: record.summary,
    isPublic: record.is_public,
  }
}
