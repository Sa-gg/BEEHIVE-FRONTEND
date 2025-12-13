import type { MenuItem } from '../../core/domain/entities/MenuItem.entity'

export type MoodType = 'energetic' | 'relaxed' | 'adventurous' | 'comfort' | 'refreshing'

export interface MoodRecommendation {
  mood: MoodType
  emoji: string
  title: string
  description: string
  items: MenuItem[]
}

const MOOD_CONFIGS: Record<MoodType, { emoji: string; title: string; description: string; categories: string[] }> = {
  energetic: {
    emoji: '⚡',
    title: 'Feeling Energetic',
    description: 'Power up with our energizing drinks and quick bites',
    categories: ['cold drinks', 'hot drinks'],
  },
  relaxed: {
    emoji: '😌',
    title: 'Just Relaxing',
    description: 'Unwind with comfort food and smooth beverages',
    categories: ['smoothie', 'platter'],
  },
  adventurous: {
    emoji: '🌶️',
    title: 'Feeling Adventurous',
    description: 'Spice things up with bold flavors',
    categories: ['appetizer', 'platter'],
  },
  comfort: {
    emoji: '🍕',
    title: 'Craving Comfort',
    description: 'Satisfy your cravings with hearty favorites',
    categories: ['pizza', 'value meal', 'savers'],
  },
  refreshing: {
    emoji: '🥤',
    title: 'Need a Refresh',
    description: 'Cool down with our fresh drinks and smoothies',
    categories: ['cold drinks', 'smoothie'],
  },
}

export const getMoodRecommendations = (allItems: MenuItem[]): MoodRecommendation[] => {
  return Object.entries(MOOD_CONFIGS).map(([mood, config]) => {
    // Filter items by category
    const moodItems = allItems.filter(item => 
      config.categories.includes(item.category) && item.available
    )
    
    // Randomly select 4-6 items for variety
    const shuffled = moodItems.sort(() => 0.5 - Math.random())
    const selectedItems = shuffled.slice(0, 6)
    
    return {
      mood: mood as MoodType,
      emoji: config.emoji,
      title: config.title,
      description: config.description,
      items: selectedItems,
    }
  })
}
