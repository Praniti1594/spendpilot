// AI Tool definitions
export type AITool = 
  | 'chatgpt'
  | 'claude'
  | 'cursor'
  | 'github-copilot'
  | 'gemini'
  | 'perplexity'
  | 'midjourney'
  | 'other'

export type PlanTier = 'free' | 'pro' | 'team' | 'enterprise' | 'custom'

// Spend item: represents one tool subscription
export interface SpendItem {
  tool: AITool
  plan: PlanTier
  monthlySpend: number
  seats: number
  teamUseCase: string // e.g., "Frontend development", "Research", "Content creation"
}

// Audit result: recommendation for a specific tool
export interface AuditRecommendation {
  tool: AITool
  currentPlan: PlanTier
  currentMonthlySpend: number
  issue: string // e.g., "Overpriced for usage", "Underutilized"
  recommendation: string
  potentialSavings: number // monthly savings
  confidence: 'high' | 'medium' | 'low' // Certainty of savings realization
  category: 'consolidation' | 'downgrade' | 'negotiation' | 'alternative' | 'no-action'
  alternativeTools?: {
    tool: AITool
    reason: string
    estimatedCost: number
  }[]
}

// Complete audit response
export interface AuditResult {
  id: string
  createdAt: string
  items: SpendItem[]
  recommendations: AuditRecommendation[]
  totalMonthlySpend: number
  totalMonthlyAfterSavings: number
  totalMonthlySavings: number
  totalAnnualSavings: number
  savingsPercentage: number
  summary?: string | null // AI-generated personalized summary
  isPublic: boolean
  publicUrl?: string
}

// Database record (for Supabase)
export interface AuditRecord {
  id: string
  items: SpendItem[]
  recommendations: AuditRecommendation[]
  total_monthly_spend: number
  total_monthly_after_savings: number
  total_monthly_savings: number
  total_annual_savings: number
  savings_percentage: number
  summary: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

// Lead capture data
export interface LeadData {
  email: string
  companyName?: string
  roleTitle?: string
  teamSize?: number
  auditId: string
  savingsAmount: number
}

// Lead record from database
export interface LeadRecord {
  id: string
  email: string
  company_name: string | null
  role_title: string | null
  team_size: number | null
  audit_id: string
  savings_amount: number
  created_at: string
}

// Lead submission request
export interface LeadSubmissionRequest {
  email: string
  companyName?: string
  roleTitle?: string
  teamSize?: number
  auditId: string
  savingsAmount: number
  summary?: string // Optional audit summary
  honeypot?: string // Abuse protection field
}
