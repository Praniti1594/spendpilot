'use client'

import { AuditForm } from './components/audit-form'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">SpendPilot</h1>
              <p className="text-sm text-gray-600">AI Spend Audit & Optimization</p>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-4xl px-4 py-12">
          <h2 className="text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            Optimize your AI tool spending
          </h2>
          <p className="mt-4 text-xl text-gray-600">
            Get personalized recommendations to reduce costs on ChatGPT, Claude, GitHub Copilot, and more. 
            Identify overlapping tools, negotiate better rates, and eliminate waste.
          </p>
          <div className="mt-8 grid gap-6 sm:grid-cols-3">
            <div className="flex gap-3">
              <div className="text-2xl">📊</div>
              <div>
                <p className="font-semibold text-gray-900">Instant Analysis</p>
                <p className="text-sm text-gray-600">See your audit results in seconds</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">🎯</div>
              <div>
                <p className="font-semibold text-gray-900">Smart Recommendations</p>
                <p className="text-sm text-gray-600">Finance-grade suggestions, not guesses</p>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="text-2xl">🔒</div>
              <div>
                <p className="font-semibold text-gray-900">Your Data</p>
                <p className="text-sm text-gray-600">No login required, shared if you choose</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Form Section */}
      <section className="mx-auto max-w-4xl px-4 py-12">
        <h3 className="mb-8 text-2xl font-bold text-gray-900">Add your AI tool subscriptions</h3>
        <AuditForm />
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-gray-50 py-8 text-center text-sm text-gray-600">
        <p>SpendPilot © 2024. Get smarter with your AI spend.</p>
      </footer>
    </div>
  )
}
