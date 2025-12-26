import type { MoodType } from './moodSystem'

/**
 * Mood Benefits System - Database-Driven
 * 
 * All mood benefits and nutrients are now stored in the database.
 * - menu_items.moodBenefits (JSON): {"mood": "explanation"}
 * - menu_items.nutrients (TEXT): Comma-separated nutrients
 * 
 * To add/edit mood benefits or nutrients, use the admin panel to update menu items directly.
 * Static data has been migrated to database. See: scripts/migrate-mood-benefits.ts
 */

// Helper function to get mood-specific explanation for a menu item from database
export const getMoodExplanation = (_itemName: string, mood: MoodType, moodBenefitsJson?: string | null): string | null => {
  // Only use database moodBenefits - no more static file fallback
  if (moodBenefitsJson) {
    try {
      const moodBenefits = JSON.parse(moodBenefitsJson) as Partial<Record<MoodType, string>>
      if (moodBenefits[mood]) {
        return moodBenefits[mood]
      }
    } catch (error) {
      console.error('Failed to parse moodBenefits:', error)
    }
  }
  
  return null
}

// Helper to get all nutrients for a menu item from database
export const getItemNutrients = (nutrientsString?: string | null): string[] => {
  if (!nutrientsString) return []
  
  // Parse comma-separated nutrients from database
  return nutrientsString
    .split(',')
    .map(n => n.trim())
    .filter(n => n.length > 0)
}
