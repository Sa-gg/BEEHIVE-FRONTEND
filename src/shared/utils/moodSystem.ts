export type MoodType = 
  | 'happy' 
  | 'relaxed' 
  | 'energetic' 
  | 'sad' 
  | 'stressed' 
  | 'angry' 
  | 'tired' 
  | 'anxious' 
  | 'depressed' 
  | 'excited'

export interface MoodOption {
  value: MoodType
  emoji: string
  label: string
  color: string
  description: string
  supportMessage?: string
  excludeCategories?: string[]
  preferredCategories?: string[]
  scientificExplanation?: string
  beneficialNutrients?: string[]
}

export const MOOD_OPTIONS: MoodOption[] = [
  {
    value: 'happy',
    emoji: '😊',
    label: 'Happy',
    color: '#F9C900',
    description: 'Celebrate your joy!',
    preferredCategories: ['pizza', 'appetizer', 'smoothie'],
    scientificExplanation: 'Maintain your positive mood with foods rich in omega-3 fatty acids and B-vitamins that support dopamine and serotonin production, the neurotransmitters responsible for happiness and well-being.',
    beneficialNutrients: ['Omega-3 (DHA/EPA)', 'Vitamin B Complex', 'Tryptophan']
  },
  {
    value: 'energetic',
    emoji: '⚡',
    label: 'Energetic',
    color: '#FF6B35',
    description: 'Keep the energy going!',
    preferredCategories: ['cold drinks', 'hot drinks', 'appetizer'],
    scientificExplanation: 'Sustain your energy with balanced meals containing complex carbohydrates and moderate caffeine. B-vitamins help convert food into cellular energy, while iron supports oxygen transport for sustained vitality.',
    beneficialNutrients: ['B-Vitamins', 'Iron', 'Complex Carbohydrates', 'Moderate Caffeine']
  },
  {
    value: 'relaxed',
    emoji: '😌',
    label: 'Relaxed',
    color: '#95E1D3',
    description: 'Enjoy the calm moment',
    preferredCategories: ['smoothie', 'hot drinks', 'platter'],
    scientificExplanation: 'Enhance relaxation with foods containing magnesium and L-theanine, which promote GABA production - a neurotransmitter that calms neural activity. Avoid excessive stimulants to maintain your peaceful state.',
    beneficialNutrients: ['Magnesium', 'L-Theanine', 'Calcium', 'Vitamin B6']
  },
  {
    value: 'excited',
    emoji: '🎉',
    label: 'Excited',
    color: '#F38181',
    description: 'Make it extra special!',
    preferredCategories: ['pizza', 'value meal', 'cold drinks'],
    scientificExplanation: 'Celebrate with foods that support dopamine levels - the neurotransmitter of reward and pleasure. Balanced nutrition helps maintain your excitement without energy crashes.',
    beneficialNutrients: ['Tyrosine', 'Vitamin D', 'Omega-3 Fatty Acids']
  },
  {
    value: 'tired',
    emoji: '😴',
    label: 'Tired',
    color: '#AA96DA',
    description: 'Recharge yourself',
    preferredCategories: ['hot drinks', 'savers', 'smoothie'],
    supportMessage: 'Take it easy, you deserve a break! ☕',
    scientificExplanation: 'Combat fatigue with foods rich in iron, vitamin B12, and CoQ10 which support cellular energy production. Moderate caffeine from coffee can provide a temporary boost, while magnesium helps reduce muscle tiredness.',
    beneficialNutrients: ['Iron', 'Vitamin B12', 'Magnesium', 'CoQ10', 'Moderate Caffeine']
  },
  {
    value: 'stressed',
    emoji: '😰',
    label: 'Stressed',
    color: '#FCBAD3',
    description: 'Let us help you unwind',
    excludeCategories: ['hot drinks'], // Avoid high caffeine
    preferredCategories: ['smoothie', 'platter', 'savers'],
    supportMessage: 'Deep breaths! We\'re here to help you feel better. 💙',
    scientificExplanation: 'Reduce stress with omega-3 fatty acids (EPA/DHA) which lower cortisol levels and reduce inflammation. Vitamin C helps regulate stress hormones, while complex carbohydrates stabilize blood sugar and mood. Avoid caffeine which can increase anxiety.',
    beneficialNutrients: ['Omega-3 (EPA/DHA)', 'Vitamin C', 'Magnesium', 'Complex Carbohydrates']
  },
  {
    value: 'anxious',
    emoji: '😟',
    label: 'Anxious',
    color: '#FFFFD2',
    description: 'Find your comfort zone',
    excludeCategories: ['cold drinks'], // Avoid cold/stimulating drinks
    preferredCategories: ['hot drinks', 'savers', 'appetizer'],
    supportMessage: 'You\'re stronger than you think. One step at a time. 🌟',
    scientificExplanation: 'Calm anxiety with magnesium-rich foods that regulate neurotransmitters and reduce nervous system excitability. Omega-3 fatty acids have been shown to reduce anxiety symptoms in clinical trials. L-theanine from tea promotes relaxation without sedation.',
    beneficialNutrients: ['Magnesium', 'Omega-3 Fatty Acids', 'L-Theanine', 'Vitamin B Complex']
  },
  {
    value: 'sad',
    emoji: '😢',
    label: 'Sad',
    color: '#A8DADC',
    description: 'Let us brighten your day',
    preferredCategories: ['smoothie', 'pizza', 'value meal'],
    supportMessage: 'It\'s okay to feel this way. We\'re here for you! 🤗',
    scientificExplanation: 'Boost mood with tryptophan-rich foods that help produce serotonin, the "feel-good" neurotransmitter. Dark chocolate contains compounds that release endorphins. Vitamin D and omega-3s have shown effectiveness in improving depressive symptoms in research studies.',
    beneficialNutrients: ['Tryptophan', 'Omega-3 (EPA/DHA)', 'Vitamin D', 'Folate', 'Dark Chocolate Compounds']
  },
  {
    value: 'depressed',
    emoji: '😔',
    label: 'Feeling Down',
    color: '#B4A7D6',
    description: 'We care about you',
    excludeCategories: [], // No alcohol or highly stimulating items
    preferredCategories: ['smoothie', 'savers', 'appetizer'],
    supportMessage: 'You matter. Take care of yourself, one meal at a time. 💛',
    scientificExplanation: 'Clinical studies show EPA and DHA omega-3 fatty acids can significantly improve depressive symptoms. Folate and vitamin B12 support neurotransmitter synthesis. Regular meals with tryptophan help maintain serotonin levels. Consider seeking professional support alongside nutritional care.',
    beneficialNutrients: ['Omega-3 (EPA/DHA)', 'Folate', 'Vitamin B12', 'Tryptophan', 'Vitamin D']
  },
  {
    value: 'angry',
    emoji: '😠',
    label: 'Angry',
    color: '#E63946',
    description: 'Cool down with us',
    preferredCategories: ['cold drinks', 'smoothie', 'appetizer'],
    supportMessage: 'Take a moment for yourself. You\'ve got this! 💪',
    scientificExplanation: 'Cool down with foods rich in omega-3 fatty acids which reduce inflammatory responses linked to irritability. Magnesium helps regulate stress hormones, while vitamin C from fresh ingredients supports adrenal function. Cold, refreshing foods can have a calming psychological effect.',
    beneficialNutrients: ['Omega-3 Fatty Acids', 'Magnesium', 'Vitamin C', 'B-Vitamins']
  },
]

export const getMoodByValue = (value: MoodType): MoodOption | undefined => {
  return MOOD_OPTIONS.find(mood => mood.value === value)
}

export const getWeatherContext = (): 'sunny' | 'rainy' | 'hot' | 'cold' | 'normal' => {
  // In production, this would call a weather API
  // For now, returning based on time
  const hour = new Date().getHours()
  if (hour >= 11 && hour <= 15) return 'hot'
  if (hour >= 6 && hour <= 9) return 'normal'
  return 'normal'
}

export const getTimeContext = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 21) return 'evening'
  return 'night'
}

export interface MoodReflection {
  orderId: string
  originalMood: MoodType
  feelingAfter: 'better' | 'same' | 'worse'
  timestamp: Date
  itemsOrdered: string[]
}

export const saveMoodReflection = (reflection: MoodReflection): void => {
  const reflections = JSON.parse(localStorage.getItem('moodReflections') || '[]')
  reflections.push(reflection)
  localStorage.setItem('moodReflections', JSON.stringify(reflections))
}

export const getMoodReflections = (): MoodReflection[] => {
  return JSON.parse(localStorage.getItem('moodReflections') || '[]')
}

export const analyzeMoodEffectiveness = (mood: MoodType): { successRate: number; topItems: string[] } => {
  const reflections = getMoodReflections()
  const moodReflections = reflections.filter(r => r.originalMood === mood)
  
  if (moodReflections.length === 0) {
    return { successRate: 0, topItems: [] }
  }
  
  const betterCount = moodReflections.filter(r => r.feelingAfter === 'better').length
  const successRate = (betterCount / moodReflections.length) * 100
  
  // Count item frequency in successful orders
  const itemCounts: Record<string, number> = {}
  moodReflections
    .filter(r => r.feelingAfter === 'better')
    .forEach(r => {
      r.itemsOrdered.forEach(item => {
        itemCounts[item] = (itemCounts[item] || 0) + 1
      })
    })
  
  const topItems = Object.entries(itemCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([item]) => item)
  
  return { successRate, topItems }
}
