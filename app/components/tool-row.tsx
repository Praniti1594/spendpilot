'use client'

import { UseFieldArrayRemove, useFormContext, useWatch } from 'react-hook-form'
import { Input, Select, Button } from './ui'
import { AI_TOOLS, PLAN_TIERS, AuditFormData } from '@/lib/forms/audit-schema'

export function ToolRow({
  index,
  onRemove,
  canRemove,
}: {
  index: number
  onRemove: UseFieldArrayRemove
  canRemove: boolean
}) {
  const { register, formState: { errors }, control } = useFormContext()
  const fieldErrors = (errors as any).tools?.[index]
  
  // Watch field values to determine if row is empty
  const toolValue = useWatch({ control, name: `tools.${index}.tool` })
  const planValue = useWatch({ control, name: `tools.${index}.plan` })
  const spendValue = useWatch({ control, name: `tools.${index}.monthlySpend` })
  const seatsValue = useWatch({ control, name: `tools.${index}.seats` })
  const teamUseValue = useWatch({ control, name: `tools.${index}.teamUseCase` })
  
  const isEmpty = !toolValue && !planValue && spendValue === '' && seatsValue === '' && !teamUseValue

  return (
    <div className={`grid gap-4 rounded-lg border p-4 transition-all sm:grid-cols-2 lg:grid-cols-6 ${
      isEmpty 
        ? 'border-gray-200 bg-gray-50 opacity-60' 
        : 'border-blue-200 bg-white'
    }`}>
      {/* Tool Select */}
      <div>
        <Select
          label="Tool"
          {...register(`tools.${index}.tool`)}
          error={fieldErrors?.tool?.message}
          options={AI_TOOLS.map((t) => ({ value: t.value, label: t.label }))}
        />
      </div>

      {/* Plan Tier */}
      <div>
        <Select
          label="Plan"
          {...register(`tools.${index}.plan`)}
          error={fieldErrors?.plan?.message}
          options={PLAN_TIERS.map((p) => ({ value: p.value, label: p.label }))}
        />
      </div>

      {/* Monthly Spend */}
      <div>
        <Input
          label="Monthly Spend"
          type="number"
          step="0.01"
          min="0"
          placeholder="e.g., 20"
          {...register(`tools.${index}.monthlySpend`)}
          error={fieldErrors?.monthlySpend?.message}
        />
      </div>

      {/* Seats */}
      <div>
        <Input
          label="Seats"
          type="number"
          min="1"
          step="1"
          placeholder="e.g., 5"
          {...register(`tools.${index}.seats`)}
          error={fieldErrors?.seats?.message}
        />
      </div>

      {/* Team Use Case */}
      <div className="lg:col-span-2">
        <Input
          label="How does your team use this?"
          placeholder="e.g., Code completion, Research"
          {...register(`tools.${index}.teamUseCase`)}
          error={fieldErrors?.teamUseCase?.message}
        />
      </div>

      {/* Remove Button */}
      <div className="flex items-end">
        <Button
          type="button"
          variant="danger"
          size="sm"
          onClick={() => onRemove(index)}
          disabled={!canRemove}
          className="w-full"
        >
          Remove
        </Button>
      </div>
    </div>
  )
}
