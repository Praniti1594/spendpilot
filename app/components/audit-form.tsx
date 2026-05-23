'use client'

import { useEffect, useState } from 'react'
import { useForm, useFieldArray, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import { AuditFormSchema, AuditFormData } from '@/lib/forms/audit-schema'
import { ToolRow } from './tool-row'
import { Button, Card } from './ui'

const STORAGE_KEY = 'spendpilot_form_data'

export function AuditForm() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const form = useForm({
    resolver: zodResolver(AuditFormSchema),
    defaultValues: {
      tools: [],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: 'tools',
  })

  // Initialize form with either localStorage data or default single tool
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved) {
      try {
        const data = JSON.parse(saved)
        form.reset(data)
      } catch (e) {
        console.error('Failed to load saved form data:', e)
        // Fallback to default empty single row
        append({
          tool: '' as any,
          plan: '' as any,
          monthlySpend: '' as any,
          seats: '' as any,
          teamUseCase: '',
        })
      }
    } else {
      // No saved data, append default single tool
      append({
        tool: '' as any,
        plan: '' as any,
        monthlySpend: '' as any,
        seats: '' as any,
        teamUseCase: '',
      })
    }
    setMounted(true)
  }, [])

  // Save to localStorage on change (debounced via submission)
  useEffect(() => {
    const subscription = form.watch((data) => {
      if (mounted) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      }
    })
    return () => subscription.unsubscribe()
  }, [form, mounted])

  const onSubmit = async (data: AuditFormData) => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await fetch('/api/audits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: data.tools }),
      })

      if (!response.ok) {
        throw new Error('Failed to create audit')
      }

      const result = await response.json()
      router.push(`/results/${result.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  if (!mounted) return null

  return (
    <FormProvider {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Tools List */}
        <Card>
          <h2 className="mb-4 text-lg font-semibold text-black-900">Your AI Tool Spend</h2>
          <div className="space-y-4">
            {fields.map((field, index) => (
              <ToolRow key={field.id} index={index} onRemove={remove} canRemove={fields.length > 1} />
            ))}
          </div>
        </Card>

        {/* Add Tool Button */}
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            append({
              tool: '' as any,
              plan: '' as any,
              monthlySpend: '' as any,
              seats: '' as any,
              teamUseCase: '',
            })
          }
        >
          + Add Tool
        </Button>

        {/* Error Message */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Form Errors */}
        {form.formState.errors.tools && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{form.formState.errors.tools.message}</p>
          </div>
        )}

        {/* Submit Button */}
        <div className="flex gap-3">
          <Button type="submit" disabled={isLoading} size="lg" className="flex-1">
            {isLoading ? 'Analyzing...' : 'Get Audit & Recommendations'}
          </Button>
        </div>
      </form>
    </FormProvider>
  )
}
