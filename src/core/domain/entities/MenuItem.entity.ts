export interface MenuItem {
  id: string
  name: string
  categoryId: string // Required for algorithm matching
  category: string // Display name (computed from category object)
  price: number
  image?: string
  description?: string
  available: boolean
  featured?: boolean
  moodBenefits?: string | null
  nutrients?: string | null // Database field storing comma-separated nutrients
  nutritionalBenefits?: {
    nutrients: string[]
    moodBenefits: {
      [key: string]: string // mood type -> explanation
    }
  }
}
