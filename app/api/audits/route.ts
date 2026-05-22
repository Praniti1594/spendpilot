import { NextRequest, NextResponse } from 'next/server'
import { initSupabaseAdmin } from '@/lib/db/supabase'
import { analyzeSpending, calculateTotals } from '@/lib/audit/engine'
import { SpendItem, AuditRecord, AuditResult } from '@/lib/db/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { items, generateSummary = false } = body

    // Validate input
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'items array is required and must not be empty' },
        { status: 400 }
      )
    }

    // Validate each item
    for (const item of items) {
      if (!item.tool || !item.plan || typeof item.monthlySpend !== 'number' || !item.seats) {
        return NextResponse.json(
          { error: 'Invalid item format. Required: tool, plan, monthlySpend, seats' },
          { status: 400 }
        )
      }
    }

    // Run audit analysis
    const recommendations = analyzeSpending(items)
    const totals = calculateTotals(items, recommendations)

    // Prepare audit record
    const auditData: Partial<AuditRecord> = {
      items: items as SpendItem[],
      recommendations,
      total_monthly_spend: totals.totalMonthlySpend,
      total_monthly_after_savings: totals.totalMonthlyAfterSavings,
      total_monthly_savings: totals.totalMonthlySavings,
      total_annual_savings: totals.totalAnnualSavings,
      savings_percentage: totals.savingsPercentage,
      summary: null,
      is_public: false,
    }

    // Save to Supabase
    const supabaseAdmin = initSupabaseAdmin()
    const { data, error } = await supabaseAdmin
      .from('audits')
      .insert([auditData])
      .select()
      .single()

    if (error) {
      console.error('Supabase error:', error)
      return NextResponse.json(
        { error: 'Failed to save audit' },
        { status: 500 }
      )
    }

    // Transform response
    const result: AuditResult = {
      id: data.id,
      createdAt: data.created_at,
      items: data.items,
      recommendations: data.recommendations,
      totalMonthlySpend: data.total_monthly_spend,
      totalMonthlyAfterSavings: data.total_monthly_after_savings,
      totalMonthlySavings: data.total_monthly_savings,
      totalAnnualSavings: data.total_annual_savings,
      savingsPercentage: data.savings_percentage,
      summary: data.summary,
      isPublic: data.is_public,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
