'use client'

import { useParams } from 'next/navigation'
import { ResultsDisplay } from '@/app/components/results-display'

export default function ResultsPage() {
  const params = useParams()
  const id = params?.id as string

  if (!id) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <p className="text-red-700">Audit ID not found</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-4xl px-4 py-12">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Audit Results</h1>
          <p className="mt-2 text-gray-600">Your AI spend analysis and recommendations</p>
        </div>
        <ResultsDisplay auditId={id} />
      </div>
    </div>
  )
}
