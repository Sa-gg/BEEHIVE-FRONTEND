export interface MenuItem {
  id: string
  name: string
  category: 'pizza' | 'appetizer' | 'hot drinks' | 'cold drinks' | 'smoothie' | 'platter' | 'savers' | 'value meal'
  price: number
  image?: string
  description?: string
  available: boolean
  featured?: boolean
  moodBenefits?: string | null
  moodOrderStats?: string | Record<string, { shown: number; ordered: number }> | null
  nutritionalBenefits?: {
    nutrients: string[]
    moodBenefits: {
      [key: string]: string // mood type -> explanation
    }
  }
}
