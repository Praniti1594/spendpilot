import { NextRequest, NextResponse } from 'next/server'
import { initSupabase, initSupabaseAdmin } from '@/lib/db/supabase'
import { AuditRecord, AuditResult } from '@/lib/db/types'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = initSupabaseAdmin()

    // For MVP: anyone with the ID can view the audit
    // The ID acts as a secret token (like Vercel deploy links)
    // Later we can add user auth + private audits
    const { data: audit, error } = await supabase
      .from('audits')
      .select('*')
      .eq('id', id)
      .single()

    if (error || !audit) {
      return NextResponse.json(
        { error: 'Audit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(transformRecord(audit))
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const supabaseAdmin = initSupabaseAdmin()

    // For now, allow making audits public without auth
    // Later we'd add user verification here
    if (body.isPublic !== undefined) {
      const { data, error } = await supabaseAdmin
        .from('audits')
        .update({ is_public: body.isPublic })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to update audit' },
          { status: 500 }
        )
      }

      return NextResponse.json(transformRecord(data))
    }

    // Allow updating summary
    if (body.summary !== undefined) {
      const { data, error } = await supabaseAdmin
        .from('audits')
        .update({ summary: body.summary })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        console.error('Supabase error:', error)
        return NextResponse.json(
          { error: 'Failed to update audit' },
          { status: 500 }
        )
      }

      return NextResponse.json(transformRecord(data))
    }

    return NextResponse.json(
      { error: 'No valid update fields provided' },
      { status: 400 }
    )
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper to transform DB record to API response
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
