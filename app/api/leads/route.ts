import { NextRequest, NextResponse } from 'next/server'
import { initSupabaseAdmin } from '@/lib/db/supabase'
import { sendLeadConfirmationEmail } from '@/lib/email/resend'
import { LeadSubmissionRequest, LeadRecord } from '@/lib/db/types'

/**
 * POST /api/leads
 * Capture lead with email + optional company/role/team info
 * Sends confirmation email and stores in Supabase
 */
export async function POST(request: NextRequest) {
  try {
    const body: LeadSubmissionRequest = await request.json()

    // Validate required fields
    if (!body.email || !body.auditId || body.savingsAmount === undefined) {
      return NextResponse.json(
        { error: 'Email, auditId, and savingsAmount are required' },
        { status: 400 }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }

    // Abuse protection: Check honeypot field
    // If honeypot field is filled, silently reject (spam bot)
    if (body.honeypot && body.honeypot.trim().length > 0) {
      console.warn('Honeypot triggered for:', body.email)
      // Return success to not alert bot
      return NextResponse.json({ success: true, message: 'Lead captured' })
    }

    const supabaseAdmin = initSupabaseAdmin()

    // Check for duplicate: same email + audit combination
    const { data: existingLead, error: checkError } = await supabaseAdmin
      .from('leads')
      .select('id')
      .eq('email', body.email)
      .eq('audit_id', body.auditId)
      .maybeSingle()

    if (!checkError && existingLead) {
      // Duplicate found - return success (don't reveal duplicate to user)
      console.info('Duplicate lead submission:', body.email, body.auditId)
      return NextResponse.json({ success: true, message: 'Lead captured' })
    }

    // Save lead to Supabase
    const { data: savedLead, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert([
        {
          email: body.email,
          company_name: body.companyName || null,
          role_title: body.roleTitle || null,
          team_size: body.teamSize || null,
          audit_id: body.auditId,
          savings_amount: body.savingsAmount,
        },
      ])
      .select()
      .single()

    if (insertError || !savedLead) {
      console.error('Failed to save lead:', insertError)
      return NextResponse.json(
        { error: 'Failed to save lead' },
        { status: 500 }
      )
    }

    // Send confirmation email (non-blocking - doesn't fail if email fails)
    const emailResult = await sendLeadConfirmationEmail({
      email: body.email,
      companyName: body.companyName,
      roleTitle: body.roleTitle,
      monthlySavings: Math.round(body.savingsAmount),
      annualSavings: Math.round(body.savingsAmount * 12),
      summary: body.summary, // Optional summary from audit
    })

    if (!emailResult.success) {
      console.warn('Email send failed for lead:', body.email, emailResult.error)
      // Don't fail the entire request - lead was saved
    }

    return NextResponse.json({
      success: true,
      message: 'Lead captured successfully',
      leadId: savedLead.id,
      emailSent: emailResult.success,
    })
  } catch (error) {
    console.error('Lead submission error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
