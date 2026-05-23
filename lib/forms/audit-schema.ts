import { z } from 'zod'
import { AITool, PlanTier } from '@/lib/db/types'

const AIToolEnum = z.enum([
  'chatgpt',
  'claude',
  'cursor',
  'github-copilot',
  'gemini',
  'perplexity',
  'midjourney',
  'other',
] as const)

const PlanTierEnum = z.enum(['free', 'pro', 'team', 'enterprise', 'custom'] as const)

export const SpendItemSchema = z.object({
  tool: z.union([AIToolEnum, z.literal('')]).default(''),
  plan: z.union([PlanTierEnum, z.literal('')]).default(''),
  monthlySpend: z.union([z.coerce.number().min(0, 'Monthly spend must be $0 or more'), z.literal('')]).default(''),
  seats: z.union([z.coerce.number().min(1, 'Must have at least 1 seat').int(), z.literal('')]).default(''),
  teamUseCase: z.string().max(200, 'Max 200 characters').default(''),
})

export const AuditFormSchema = z.object({
  tools: z.array(SpendItemSchema).min(1, 'Add at least one tool').max(20, 'Maximum 20 tools'),
}).refine(
  (data) => {
    // Ensure all tool rows are either fully filled or fully empty
    return data.tools.every(tool => {
      const isFilled = tool.tool && tool.plan && tool.monthlySpend !== '' && tool.seats !== '' && tool.teamUseCase.trim()
      const isEmpty = !tool.tool && !tool.plan && tool.monthlySpend === '' && tool.seats === '' && !tool.teamUseCase.trim()
      return isFilled || isEmpty
    })
  },
  {
    message: 'Each tool row must be either fully filled out or completely empty',
    path: ['tools'],
  }
)

export type AuditFormData = z.infer<typeof AuditFormSchema>
export type SpendItemData = z.infer<typeof SpendItemSchema>

export const AI_TOOLS: { value: AITool; label: string; description: string }[] = [
  { value: 'chatgpt', label: 'ChatGPT', description: 'OpenAI GPT-4, Plus, Team' },
  { value: 'claude', label: 'Claude', description: 'Anthropic Claude Pro/Team' },
  { value: 'cursor', label: 'Cursor', description: 'AI-powered code editor' },
  { value: 'github-copilot', label: 'GitHub Copilot', description: 'Code completion' },
  { value: 'gemini', label: 'Gemini', description: 'Google Gemini Advanced' },
  { value: 'perplexity', label: 'Perplexity', description: 'Perplexity Pro' },
  { value: 'midjourney', label: 'Midjourney', description: 'AI image generation' },
  { value: 'other', label: 'Other', description: 'Other AI tool' },
]

export const PLAN_TIERS: { value: PlanTier; label: string }[] = [
  { value: 'free', label: 'Free' },
  { value: 'pro', label: 'Pro / Personal' },
  { value: 'team', label: 'Team' },
  { value: 'enterprise', label: 'Enterprise' },
  { value: 'custom', label: 'Custom' },
]
