'use client'

import { useState } from 'react'
import { Button, Card, Input } from './ui'

interface LeadCaptureProps {
  auditId: string
  monthlySavings: number
  annualSavings: number
  summary?: string
}

export function LeadCapture({
  auditId,
  monthlySavings,
  annualSavings,
  summary,
}: LeadCaptureProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [roleTitle, setRoleTitle] = useState('')
  const [teamSize, setTeamSize] = useState('')

  const isHighSavings = monthlySavings >= 500 // $500+ monthly savings

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          companyName: companyName || undefined,
          roleTitle: roleTitle || undefined,
          teamSize: teamSize ? parseInt(teamSize) : undefined,
          auditId,
          savingsAmount: monthlySavings,
          summary,
          honeypot: '', // Honeypot field (empty by default)
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to submit')
      }

      setIsSubmitted(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setIsLoading(false)
    }
  }

  // Success state
  if (isSubmitted) {
    return (
      <Card className="border-green-200 bg-gradient-to-r from-green-50 to-emerald-50">
        <div className="text-center">
          <div className="mb-3 text-3xl">✓</div>
          <h3 className="mb-2 text-lg font-semibold text-gray-900">Thank you!</h3>
          <p className="text-sm text-gray-700">
            We've sent your audit results and recommendations to <strong>{email}</strong>
          </p>
          {isHighSavings && (
            <p className="mt-4 text-sm text-green-700">
              Our team will reach out about infrastructure optimization opportunities.
            </p>
          )}
        </div>
      </Card>
    )
  }

  return (
    <Card>
      <div className="mb-6">
        <h3 className="mb-2 text-lg font-semibold text-gray-900">
          {isHighSavings ? 'Talk to Credex' : 'Get Notified'}
        </h3>
        <p className="text-sm text-gray-600">
          {isHighSavings
            ? "Credex specializes in infrastructure cost reduction. We'll connect you with a specialist to discuss additional savings."
            : "We'll notify you when new optimization opportunities apply to your team."}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Email - Required */}
        <div>
          <Input
            label="Work Email *"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.currentTarget.value)}
            required
          />
        </div>

        {/* Company Name - Optional */}
        <div>
          <Input
            label="Company Name"
            placeholder="Your company"
            value={companyName}
            onChange={(e) => setCompanyName(e.currentTarget.value)}
          />
        </div>

        {/* Role/Title - Optional */}
        <div>
          <Input
            label="Your Role"
            placeholder="e.g., Finance Manager, CTO"
            value={roleTitle}
            onChange={(e) => setRoleTitle(e.currentTarget.value)}
          />
        </div>

        {/* Team Size - Optional */}
        <div>
          <Input
            label="Team Size"
            type="number"
            min="1"
            placeholder="Number of people using AI tools"
            value={teamSize}
            onChange={(e) => setTeamSize(e.currentTarget.value)}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <Button type="submit" disabled={isLoading} className="w-full">
          {isLoading ? 'Sending...' : isHighSavings ? 'Connect with Specialist' : 'Get Notified'}
        </Button>

        <p className="text-xs text-gray-500 text-center">
          We respect your privacy. Unsubscribe anytime.
        </p>
      </form>
    </Card>
  )
}
