'use client'

import { useEffect, useState } from 'react'
import { AuditResult } from '@/lib/db/types'
import { Badge, Card, Button } from '../components/ui'
import { LeadCapture } from './lead-capture'

const confidenceColors = {
  high: 'success',
  medium: 'info',
  low: 'warning',
} as const

const categoryLabels = {
  consolidation: '🔗 Consolidation',
  downgrade: '⬇️ Downgrade',
  negotiation: '💬 Negotiation',
  alternative: '🔄 Alternative',
  'no-action': '✓ Well Optimized',
} as const

export function ResultsDisplay({ auditId }: { auditId: string }) {
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(false)

  useEffect(() => {
    const fetchAudit = async () => {
      try {
        const response = await fetch(`/api/audits/${auditId}`)
        if (!response.ok) throw new Error('Audit not found')
        const data = await response.json()
        setAudit(data)

        // If no summary yet, generate it asynchronously
        if (!data.summary) {
          setSummaryLoading(true)
          try {
            const summaryResponse = await fetch(`/api/audits/${auditId}/summary`, {
              method: 'POST',
            })
            if (summaryResponse.ok) {
              const updatedAudit = await summaryResponse.json()
              setAudit(updatedAudit)
            }
          } catch (err) {
            console.warn('Error generating summary:', err)
          } finally {
            setSummaryLoading(false)
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load audit')
      } finally {
        setLoading(false)
      }
    }

    fetchAudit()
  }, [auditId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="mb-4 text-lg font-medium text-gray-600">Loading audit...</div>
        </div>
      </div>
    )
  }

  if (error || !audit) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <p className="text-red-700">{error || 'Audit not found'}</p>
      </div>
    )
  }

  // Group recommendations by category
  const grouped = audit.recommendations.reduce(
    (acc, rec) => {
      if (!acc[rec.category]) acc[rec.category] = []
      acc[rec.category].push(rec)
      return acc
    },
    {} as Record<string, typeof audit.recommendations>
  )

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="mb-4 text-5xl font-bold text-blue-600">
            ${audit.totalMonthlySavings.toFixed(0)}
          </div>
          <p className="mb-6 text-lg text-gray-700">
            potential monthly savings ({audit.savingsPercentage.toFixed(1)}% of spend)
          </p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <div className="text-2xl font-semibold text-gray-900">${audit.totalMonthlySpend.toFixed(0)}</div>
              <p className="text-sm text-gray-600">Current spend</p>
            </div>
            <div>
              <div className="text-2xl font-semibold text-gray-900">${audit.totalMonthlyAfterSavings.toFixed(0)}</div>
              <p className="text-sm text-gray-600">After optimization</p>
            </div>
            <div>
              <div className="text-2xl font-semibold text-green-600">${audit.totalAnnualSavings.toFixed(0)}</div>
              <p className="text-sm text-gray-600">Annual savings</p>
            </div>
          </div>
        </div>
      </Card>

      {/* Recommendations by Category */}
      {Object.entries(grouped).map(([category, recs]) => (
        <div key={category}>
          <h3 className="mb-4 text-lg font-semibold text-gray-900">
            {categoryLabels[category as keyof typeof categoryLabels]}
          </h3>
          <div className="space-y-3">
            {recs.map((rec, idx) => {
              const isOptimized = category === 'no-action'
              return (
                <Card
                  key={idx}
                  className={isOptimized ? 'border-green-200 bg-gradient-to-r from-green-50 to-emerald-50' : ''}
                >
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <span className="font-semibold text-gray-900">{rec.tool}</span>
                      {isOptimized ? (
                        <Badge variant="success">Optimized</Badge>
                      ) : (
                        <Badge variant={confidenceColors[rec.confidence]}>
                          {rec.confidence.charAt(0).toUpperCase() + rec.confidence.slice(1)} confidence
                        </Badge>
                      )}
                    </div>
                    <p className={`mb-2 text-sm ${isOptimized ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                      {rec.issue}
                    </p>
                    <p className={`text-sm ${isOptimized ? 'text-green-700' : 'text-gray-700'}`}>
                      {rec.recommendation}
                    </p>
                    {rec.potentialSavings > 0 && (
                      <p className="mt-2 text-sm font-semibold text-green-600">
                        Potential savings: ${rec.potentialSavings.toFixed(0)}/month
                      </p>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      ))}

      {/* Current Spend Summary */}
      <Card>
        <h3 className="mb-4 text-lg font-semibold text-gray-900">Your Current Spend</h3>
        <div className="space-y-2">
          {audit.items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <div>
                <span className="font-medium text-gray-900">{item.tool}</span>
                <span className="ml-2 text-gray-600">
                  ({item.seats} {item.seats === 1 ? 'seat' : 'seats'}, {item.plan})
                </span>
              </div>
              <span className="font-semibold text-gray-900">${item.monthlySpend.toFixed(0)}/mo</span>
            </div>
          ))}
        </div>
      </Card>

      {/* AI Summary */}
      {audit.summary || summaryLoading ? (
        <Card className="bg-blue-50">
          <h3 className="mb-2 text-lg font-semibold text-gray-900">AI Summary</h3>
          {summaryLoading ? (
            <p className="animate-pulse text-sm text-gray-500">Generating personalized summary...</p>
          ) : (
            <p className="text-sm text-gray-700">{audit.summary}</p>
          )}
        </Card>
      ) : null}

      {/* Lead Capture */}
      <LeadCapture
        auditId={audit.id}
        monthlySavings={audit.totalMonthlySavings}
        annualSavings={audit.totalAnnualSavings}
        summary={audit.summary || undefined}
      />

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={() => {
            // Toggle public
          }}
          className="flex-1"
        >
          Share Results
        </Button>
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            localStorage.removeItem('spendpilot_form_data')
            window.location.href = '/'
          }}
          className="flex-1"
        >
          Run New Audit
        </Button>
      </div>
    </div>
  )
}
