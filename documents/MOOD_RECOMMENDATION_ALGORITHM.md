# Mood-Based Recommendation Algorithm Documentation

## Executive Summary

This document provides a comprehensive technical explanation of the Mood-Based Menu Recommendation System implemented in the Beehive application. The algorithm uses a **multi-factor scoring system** combined with **statistical confidence intervals (Wilson Score)** and **exploration-exploitation balancing (UCB)** to provide personalized menu recommendations based on customer mood selections.

---

## Table of Contents

1. [System Overview](#system-overview)
2. [Algorithm Architecture](#algorithm-architecture)
3. [Scoring Factors (6 Weighted Components)](#scoring-factors)
4. [Three-Stage Learning System](#three-stage-learning-system)
5. [Statistical Methods](#statistical-methods)
6. [Configuration Parameters](#configuration-parameters)
7. [Implementation Details](#implementation-details)
8. [Database Schema](#database-schema)
9. [Appendix: Formulas](#appendix-formulas)

---

## System Overview

### Purpose
The mood-based recommendation system aims to:
1. **Personalize** menu suggestions based on customer emotional state
2. **Learn** from customer behavior over time (orders and feedback)
3. **Balance** exploitation of known good items with exploration of new items
4. **Maintain statistical rigor** to avoid ranking bias from small sample sizes

### High-Level Flow
```
Customer selects mood → System calculates scores → Items ranked → Top 8 displayed
         ↓                                                            ↓
    Feedback loop ←←←←←←←←← Order data + Mood improvement feedback ←←←
```

### Data Architecture

#### Primary Data Tables (PostgreSQL)
- **`menu_item_mood_stats`** - Per-item per-mood statistics (main ML data source)
- **`mood_order_stats`** - Aggregate statistics per mood
- **`mood_feedback_config`** - Algorithm configuration and weights
- **`mood_settings`** - Mood definitions with preferred categories

#### Menu Item Data
- **`menu_items.moodBenefits`** (JSON) - Scientific explanations for mood benefits
- **`menu_items.featured`** - Staff-promoted items

---

## Algorithm Architecture

### Total Score Formula

```
TotalScore = MoodBenefitsScore + PreferredCategoryScore + HistoricalScore 
           + FeaturedScore + TimeOfDayScore + ExplorationBonus
```

### Maximum Possible Score: **~63 points**
| Factor | Max Points | Config Key | Description |
|--------|------------|------------|-----------|
| Mood Benefits | 20 | `moodBenefitsWeight` | Scientific mood explanation present |
| Preferred Category | 10 | `preferredCategoryWeight` | Item in mood's preferred categories |
| Excluded Category | -10 | `excludedCategoryPenalty` | Penalty for excluded categories (optional) |
| Historical Success | 15 (capped) | `historicalDataWeight` | Based on order rate + improvement (**capped at 2× neutral**) |
| Featured Items | 5 | `featuredItemWeight` | Staff-promoted items |
| Time of Day | 5 | `timeOfDayWeight` | Time-appropriate categories (**skipped if excluded**) |
| Exploration Bonus | 8 | `explorationBonusWeight` | UCB bonus for under-sampled items |

---

## Scoring Factors

### 1. Mood Benefits Score (0-20 points)

**Purpose**: Prioritize items with scientifically-backed mood improvement properties.

**Condition**: Item has a `scientificExplanation` in its `moodBenefits` JSON for the selected mood.

**Implementation** (from `MenuPage.tsx`):
```typescript
const hasExplanation = getMoodExplanation(item.name, selectedMood, item.moodBenefits)
if (hasExplanation) {
  score += scoringWeights.moodBenefits  // Default: 20 points
}
```

**Example**:
- Dark Chocolate Cake has `moodBenefits.happy.scientificExplanation = "Cocoa releases endorphins..."`
- When customer selects "happy" mood → Item gets +20 points

---

### 2. Preferred Category Score (0-10 points)

**Purpose**: Boost items in categories that are generally beneficial for the selected mood.

**Condition**: Item's category matches one of the mood's `preferredCategories`.

**Implementation**:
```typescript
if (moodConfig.preferredCategories?.includes(item.category)) {
  score += scoringWeights.preferredCategory  // Default: 10 points
}
```

**Example Configuration** (per mood):
| Mood | Preferred Categories |
|------|---------------------|
| Happy | DESSERT, COLD_DRINKS |
| Sad | HOT_DRINKS, COMFORT_FOOD |
| Stressed | HOT_DRINKS, LIGHT_MEALS |
| Energetic | COLD_DRINKS, SNACKS |
| Tired | HOT_DRINKS, SAVERS |
| Relaxed | SMOOTHIE, HOT_DRINKS |

---

### 2b. Excluded Category Penalty (0 to -10 points, configurable)

**Purpose**: Penalize or filter out items in categories that may negatively affect the selected mood.

**Configuration Options**:
- `excludedCategoryPenalty = 0` (default): Items in excluded categories are **completely filtered out**
- `excludedCategoryPenalty > 0`: Items get **negative points** but can still appear if other scores are high enough

**Implementation**:
```typescript
const useExcludedCategoryPenalty = scoringWeights.excludedCategoryPenalty > 0

// In filter step (if penalty = 0)
if (!useExcludedCategoryPenalty && moodConfig.excludeCategories?.includes(item.category)) {
  return false // Filter out completely
}

// In scoring step (if penalty > 0)
if (useExcludedCategoryPenalty && moodConfig.excludeCategories?.includes(item.category)) {
  score -= scoringWeights.excludedCategoryPenalty  // e.g., -5 points
  breakdown.excludedCategory = -scoringWeights.excludedCategoryPenalty
}
```

**Example**:
- Mood: TIRED, excludeCategories: ["COLD_DRINKS"]
- With `excludedCategoryPenalty = 0`: Cold drinks are hidden completely
- With `excludedCategoryPenalty = 5`: Cold drinks get -5 points but may still appear

**Recommended Value**: 5-8 points
- **5 points**: Items can still appear if they have mood benefits (+20) or are in preferred category (+10)
- **8 points**: Strong deterrent, but exceptional items with mood benefits can still break through
- **0 points**: Complete filtering (items never shown) - safest but most restrictive

**Example Scenario** (excludedCategoryPenalty = 5):
| Item | Mood Benefits | Preferred Cat | Excluded Cat | Historical | Net Score |
|------|--------------|---------------|--------------|------------|-----------|
| Iced Coffee (excluded) | +20 | 0 | -5 | +7.5 | **22.5** ✅ Shows |
| Cold Brew (excluded) | 0 | 0 | -5 | +7.5 | **2.5** ❌ Hidden |
| Hot Tea (preferred) | +20 | +10 | 0 | +7.5 | **37.5** ✅ Top |

---

### 3. Historical Success Score (0-15 points, proportional)

**Purpose**: Learn from past customer behavior to surface items that historically perform well for each mood.

**⚠️ This is the most complex factor with THREE STAGES:**

#### Stage 1: Day 0 (Insufficient Data)
- **Condition**: `timesOrdered < minimumOrdersThreshold` (default: 10 orders)
- **Score**: Neutral score (7.5 points) + Exploration bonus
- **Rationale**: New items shouldn't be penalized or unfairly boosted

```typescript
if (!itemStats || (itemStats.timesOrdered || 0) < MINIMUM_ORDERS_THRESHOLD) {
  score += NEUTRAL_HISTORICAL_SCORE  // 7.5 = half of 15
  score += calculateExplorationBonus(itemExposures, totalExposures, MAX_EXPLORATION_BONUS)
}
```

#### Stage 2: Baseline (Order Data Only)
- **Condition**: Sufficient orders, but `feedbackEnabled = false`
- **Score**: `WilsonScore(orderRate) × 15`
- **Rationale**: Use order rate as proxy for item success

```typescript
if (!baselineReached) {
  // 100% weight on order rate
  historicalScore = wilsonScore(orders, shown) * scoringWeights.historical
}
```

#### Stage 3: Post-Baseline (Order + Feedback Data)
- **Condition**: `feedbackEnabled = true` (admin-enabled or auto-enabled after threshold)
- **Score**: `[(OrderRate × 60%) + (ImprovementRate × 40%)] × 15`
- **Rationale**: Incorporate mood improvement feedback for refined recommendations

```typescript
if (baselineReached) {
  const combinedRate = (orderRate * 0.6) + (improvementRate * 0.4)
  historicalScore = combinedRate * scoringWeights.historical
}
```

---

### 4. Featured Items Score (0-5 points)

**Purpose**: Allow staff to manually promote items.

**Implementation**:
```typescript
if (item.featured) {
  score += scoringWeights.featured  // Default: 5 points
}
```

---

### 5. Time of Day Score (0-5 points)

**Purpose**: Surface contextually appropriate items based on current time.

**Time Periods** (configurable in admin panel):
| Period | Default Hours | Example Categories |
|--------|---------------|-------------------|
| Morning | 6:00 - 12:00 | HOT_DRINKS |
| Afternoon | 12:00 - 18:00 | (configurable) |
| Evening | 18:00 - 6:00 | HOT_DRINKS, PLATTER |

**Implementation**:
```typescript
const timeContext = getTimeContext() // 'morning' | 'afternoon' | 'evening'
const itemCategoryUpper = item.category?.toUpperCase().replace(' ', '_')

if (timeContext === 'morning' && timeConfig.morningCategories.includes(itemCategoryUpper)) {
  score += scoringWeights.timeOfDay  // Default: 5 points
}
```

---

### 6. Exploration Bonus (0-8 points, dynamic)

**Purpose**: Ensure under-sampled items get fair exposure using Upper Confidence Bound (UCB) algorithm.

**Formula**:
```
ExplorationBonus = min(sqrt(2 × ln(totalExposures + 1) / itemExposures) × 1.5, maxBonus)
```

**Implementation**:
```typescript
const calculateExplorationBonus = (itemExposures, totalExposures, maxBonus) => {
  if (itemExposures === 0 || totalExposures === 0) return maxBonus // Max for unexplored
  const bonus = Math.sqrt((2 * Math.log(totalExposures + 1)) / itemExposures)
  return Math.min(bonus * 1.5, maxBonus) // Scale and cap
}
```

**Behavior**:
| Item Exposures | Total Exposures | Exploration Bonus |
|---------------|-----------------|-------------------|
| 0 | Any | 8.0 (maximum) |
| 5 | 100 | ~7.4 |
| 50 | 500 | ~3.6 |
| 200 | 1000 | ~2.2 |

---

## Three-Stage Learning System

### ⚠️ Important Clarification: This is NOT a Pure Baseline

The system provides mood-based recommendations from Day 1. This is **not** a "pure baseline" or control group where users see no recommendations. Instead, it's a **cold-start recommendation system with neutral priors**.

**What this means:**
- Users input mood → System shows recommendations (always)
- But during cold-start: recommendations use **weak signals** + **strong exploration**
- Feedback is **excluded from learning** until threshold reached

This is acceptable and common in production systems because:
1. Users expect personalization once they provide input
2. Influence is controlled through neutral priors and exploration
3. Early nudges do not become "evidence" (feedback excluded)

### Visual Timeline

```
┌─────────────────────────┐    ┌──────────────────────┐    ┌─────────────────────────┐
│     COLD-START PHASE    │    │   DATA COLLECTION    │    │   FEEDBACK-ENABLED      │
│   (0-10 orders/item)    │───▶│    (10+ orders)      │───▶│   (Feedback enabled)    │
├─────────────────────────┤    ├──────────────────────┤    ├─────────────────────────┤
│ Neutral priors          │    │ Order-based only     │    │ Combined scoring        │
│ + Max UCB exploration   │    │ Wilson Score applied │    │ 60% order + 40% improve │
│ + Tiebreaker shuffle    │    │ Feedback excluded    │    │ Full optimization       │
│                         │    │                      │    │                         │
│ Score: 7.5 + UCB(max)   │    │ Score: Wilson × 15   │    │ Score: Combined × 15    │
└─────────────────────────┘    └──────────────────────┘    └─────────────────────────┘
         ↓                              ↓                            ↓
   Recommendations shown         Recommendations shown        Recommendations shown
   Feedback NOT used            Feedback NOT used             Feedback USED
```

### Stage Transition Triggers

| Current Stage | Transition Condition | Next Stage |
|--------------|---------------------|------------|
| Cold-Start | Item reaches `minimumOrdersThreshold` (10) orders | Data Collection |
| Data Collection | Admin enables feedback OR auto-enable after `baselineThreshold` (50) | Feedback-Enabled |

### Why Three Stages?

1. **Cold-Start Phase**: Prevents rich-get-richer - neutral scores + max exploration ensures fair exposure
2. **Data Collection Phase**: Builds statistical confidence using order data before incorporating subjective feedback
3. **Feedback-Enabled Phase**: Combines objective behavior (orders) with subjective outcomes (mood improvement)

### Cold-Start Safeguards

| Safeguard | Purpose | Implementation |
|-----------|---------|----------------|
| Neutral Historical Score | Prevent early items from dominating | Score = 7.5/15 (middle) |
| Maximum UCB Exploration | Force exposure of under-sampled items | UCB bonus = max (8 pts) |
| Tiebreaker Shuffle | Prevent position bias for equal scores | Fisher-Yates shuffle |
| Feedback Exclusion | Prevent self-fulfilling prophecy | Feedback ignored until threshold |

---

## Statistical Methods

### Wilson Score Confidence Interval

**Problem Solved**: Raw percentages are misleading with small samples.

| Item | Orders | Shown | Raw Rate | Wilson Score |
|------|--------|-------|----------|--------------|
| A | 5 | 5 | 100% | 56.6% |
| B | 450 | 500 | 90% | 87.4% |

**Result**: Item B correctly ranks higher despite lower raw percentage because we have more confidence in the data.

**Formula** (95% confidence interval lower bound):
```
WilsonScore = (p̂ + z²/2n - z√(p̂(1-p̂)/n + z²/4n²)) / (1 + z²/n)


Where:
- p̂ = observed success rate (successes/total)
- n = sample size
- z = 1.96 for 95% confidence
```

**Implementation**:
```typescript
const wilsonScore = (successes: number, total: number, confidence: number = 1.96): number => {
  if (total === 0) return 0
  
  const p = successes / total
  const n = total
  const z = confidence
  
  const denominator = 1 + z * z / n
  const center = p + z * z / (2 * n)
  const margin = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))
  
  return Math.max(0, (center - margin) / denominator)
}
```

### Upper Confidence Bound (UCB) Exploration

**Problem Solved**: Popular items dominate exposure → New items never shown → Rich get richer.

**Solution**: Give bonus points to under-exposed items, decaying as exposure increases.

```
UCB(item) = √(2 × ln(totalExposures + 1) / itemExposures) × scaleFactor
```

### Day 0 Position Bias Prevention

**Problem**: On Day 0, all items have equal scores (7.5 + exploration). Without randomization, items always appear in the same order → Position bias (top items get more clicks).

**Two-Layer Solution**:

#### Layer 1: Tiebreaker Shuffle (for equal scores)
Items with **equal scores** are shuffled using Fisher-Yates algorithm:

```typescript
const shuffleEqualScores = (items) => {
  // Group items by score
  const scoreGroups = new Map()
  items.forEach(entry => {
    const roundedScore = Math.round(entry.score * 100) / 100
    if (!scoreGroups.has(roundedScore)) {
      scoreGroups.set(roundedScore, [])
    }
    scoreGroups.get(roundedScore).push(entry)
  })
  
  // Fisher-Yates shuffle within each group
  const shuffleArray = (array) => {
    const shuffled = [...array]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }
  
  // Rebuild sorted by score, shuffled within ties
  const sortedScores = Array.from(scoreGroups.keys()).sort((a, b) => b - a)
  return sortedScores.flatMap(score => shuffleArray(scoreGroups.get(score)))
}
```

#### Layer 2: Day 0 Position Shuffle (for display order)
**NEW**: Even after scoring, the final display order of the top 8 items is randomized to prevent left-position bias in the horizontal scroll.

**Configuration**: `day0PositionShuffle` (default: true)

```typescript
// After getting top 8 by score
let topRecommended = shuffledItems.slice(0, 8).map(s => s.item)

// Day 0 Position Shuffle: Randomize display order
const shouldShufflePosition = feedbackConfig?.day0PositionShuffle ?? true
if (shouldShufflePosition) {
  // Fisher-Yates shuffle for display order
  const shuffled = [...topRecommended]
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
  }
  topRecommended = shuffled
}
```

**Why Two Layers?**
1. **Tiebreaker shuffle** ensures items with equal scores get fair exposure
2. **Position shuffle** ensures the #1 position (leftmost) doesn't always show the highest-scoring item

**UI Design Choices**:
- ✅ Grid layout (no clear #1 position)
- ✅ No rank numbers displayed
- ✅ Position shuffle randomizes horizontal scroll order

---

## Known Weaknesses & Improvement Roadmap

This section documents identified algorithm weaknesses, their severity, which learning phase they affect, and recommended fixes.

### Weakness Summary by Phase

| ID | Weakness | Severity | Affected Phases | Status |
|----|----------|----------|-----------------|--------|
| W1 | Mood Benefits Dominance (34% of score) | Medium | All Phases | ⚠️ By Design |
| W2 | ~~UCB Too Weak (was 3 pts = 5.2%)~~ | ~~High~~ | ~~Cold-Start~~ | ✅ **FIXED** (now 8 pts = 12.7%) |
| W3 | ~~No Historical Cap (winners stay winners)~~ | ~~Medium~~ | ~~Data Collection, Feedback-Enabled~~ | ✅ **FIXED** (capped at 2× neutral) |
| W4 | Feedback Selection Bias | Low | Feedback-Enabled | 🔧 Future |
| W5 | Featured Permanent Boost | Low | All Phases | 🔧 Future |
| W6 | ~~Time-Mood Conflict (excluded + time)~~ | ~~Low~~ | ~~All Phases~~ | ✅ **FIXED** (skip time bonus if excluded) |
| W7 | No Data Decay (old orders = new orders) | Medium | Data Collection, Feedback-Enabled | 🔧 Future |
| W8 | Per-Item Stage Transitions | Info | All Phases | ✅ By Design |

---

### W1: Mood Benefits Dominance (Medium - All Phases)

**Problem**: Mood Benefits at 20 points is 34% of the max 58 score. Items without mood benefits start at a significant disadvantage.

**Phase Impact**:
- **Cold-Start**: New items without mood benefits can still compete via UCB exploration
- **Data Collection**: Historical success (15 pts) can partially compensate
- **Feedback-Enabled**: Same as Data Collection

**Recommendation**: This is intentional - scientific evidence should dominate. However, consider:
- Reducing to 15 pts if you want more variety
- Or adding mood benefits to more items in the database

**Status**: ⚠️ By Design - No fix needed unless variety is prioritized over science

---

### W2: UCB Too Weak ✅ FIXED

**Problem**: ~~Original UCB max of 3 points was only 5.2% of max score, easily overwhelmed by mood benefits (20 pts)~~

**Solution Implemented**: Increased UCB from 3 → 8 points (12.7% of max score)

**New Behavior**:
| Item Exposures | Total Exposures | Old Bonus | New Bonus |
|---------------|-----------------|-----------|-----------|
| 0 | Any | 3.0 | **8.0** |
| 5 | 100 | ~2.8 | **~7.5** |
| 50 | 500 | ~1.4 | **~3.7** |
| 200 | 1000 | ~0.8 | **~2.1** |

**Phase Impact**: Primarily Cold-Start Phase, where exploration is most critical

**Status**: ✅ **FIXED** - UCB now strong enough to compete with mood benefits

---

### W3: No Historical Cap ✅ FIXED

**Problem**: ~~Once an item accumulates high orders, it maintains advantage indefinitely. Historical success has no ceiling relative to neutral score (7.5 vs potential 15).~~

**Solution Implemented**: Cap historical score at 2× neutral score

**New Behavior**:
| Stage | Neutral Score | Max Historical | Cap Applied |
|-------|---------------|----------------|-------------|
| Cold-Start | 7.5 pts | 7.5 pts | N/A (uses neutral) |
| Data Collection | 7.5 pts | 15 pts → **capped at 15** | `Math.min(score, neutral × 2)` |
| Feedback-Enabled | 7.5 pts | 15 pts → **capped at 15** | `Math.min(score, neutral × 2)` |

**Implementation** (MenuPage.tsx & MoodSettingsPage.tsx):
```typescript
// FIX W3: Cap historical score at 2× neutral score
const HISTORICAL_CAP = NEUTRAL_HISTORICAL_SCORE * 2  // 7.5 × 2 = 15 pts max

if (!baselineReached) {
  historicalScore = Math.min(orderRate * weights.historical, HISTORICAL_CAP)
} else {
  const combinedRate = (orderRate * 0.6) + (improvementRate * 0.4)
  historicalScore = Math.min(combinedRate * weights.historical, HISTORICAL_CAP)
}
```

**Result**: Even items with 100% order rate cannot exceed 15 points (2× neutral), ensuring new items at 7.5 pts can still compete.

**Status**: ✅ **FIXED** - Historical advantage now capped

---

### W4: Feedback Selection Bias (Low - Feedback-Enabled Only)

**Problem**: Customers who leave feedback may be systematically different from those who don't (more satisfied or more vocal).

**Phase Impact**:
- **Cold-Start**: Not affected (feedback excluded)
- **Data Collection**: Not affected (feedback excluded)
- **Feedback-Enabled**: Potentially biased improvement rates

**Recommendation**: 
1. Track feedback response rate per customer segment
2. Consider weighting feedback by customer type
3. Use A/B testing to validate feedback reliability

**Status**: 🔧 Future Enhancement - Requires more data collection

---

### W5: Featured Permanent Boost (Low - All Phases)

**Problem**: Featured items get +5 points permanently until admin removes the flag. No automatic decay.

**Phase Impact**: All phases equally affected

**Recommendation**: 
- Add "Featured Until" date field
- Or implement weekly rotation system
- Or reduce to +3 pts for less impact

**Status**: 🔧 Future Enhancement - Low priority

---

### W6: Time-Mood Conflict ✅ FIXED

**Problem**: ~~If a category is excluded for a mood but boosted by time-of-day, the item gets both penalties (-X) and bonus (+5). This can lead to confusing scores.~~

**Example Before Fix**: 
- TIRED mood excludes COLD_DRINKS
- Evening config includes COLD_DRINKS  
- Iced Coffee: -5 (excluded) + 5 (evening) = 0 net time impact ❌

**Solution Implemented**: Skip time bonus if item is in excluded category for current mood

**Implementation** (MenuPage.tsx & MoodSettingsPage.tsx):
```typescript
// FIX W6: Skip time bonus if item is in excluded category
const isExcludedForMood = moodConfig.excludeCategories?.some(
  (cat: string) => cat.toUpperCase() === itemCategoryUpper
)

// Only give time bonus if NOT in excluded categories
if (!isExcludedForMood) {
  if (timeContext === 'evening' && eveningCategories.includes(itemCategory)) {
    score += timeOfDayWeight
  }
}
```

**Example After Fix**:
- TIRED mood excludes COLD_DRINKS
- Evening config includes COLD_DRINKS
- Iced Coffee: -5 (excluded) + 0 (time bonus skipped) = -5 net ✅

**Result**: Excluded items no longer receive conflicting time bonuses, making scores more intuitive.

**Status**: ✅ **FIXED** - Time bonus now respects mood exclusions

---

### W7: No Data Decay (Medium - Data Collection & Feedback-Enabled)

**Problem**: Order data from 6 months ago weighs the same as yesterday's data. Customer preferences and menu quality can change over time.

**Phase Impact**:
- **Cold-Start**: Not affected (no historical data used)
- **Data Collection**: Old data may not reflect current quality
- **Feedback-Enabled**: Same issue

**Recommendation**: Implement time-weighted scoring:
```typescript
// Proposed: Weight recent orders more heavily
const recencyWeight = Math.exp(-daysOld / 90)  // 90-day half-life
adjustedOrders = orders.map(o => o.count * recencyWeight)
```

**Status**: 🔧 Future Enhancement - Requires schema changes

---

### W8: Per-Item Stage Transitions (Info - All Phases)

**Observation**: Stage transitions happen per-item, not globally. Item A can be in Cold-Start while Item B is in Data Collection.

**Phase Impact**: This is correct and intentional

**Why This Is Good**:
- New items get Cold-Start protections immediately
- Established items don't lose their data when new items are added
- Each item progresses independently based on its own order count

**Status**: ✅ By Design - No fix needed

---

### Priority Fix Checklist

| Priority | Fix | Effort | Impact |
|----------|-----|--------|--------|
| ✅ Done | UCB increase (3 → 8) | Low | High |
| 🔴 High | Historical cap at 2× neutral | Low | Medium |
| 🟡 Medium | Data decay (90-day half-life) | Medium | Medium |
| 🟢 Low | Time-Mood conflict validation | Low | Low |
| 🟢 Low | Featured item expiry | Low | Low |
| 🔵 Info | Feedback selection bias | High | Unknown |

---

## Configuration Parameters

All parameters are stored in `mood_feedback_config` table and configurable via admin panel (Mood Settings → Configuration).

### Scoring Weights
| Parameter | Default | UI Label | Description |
|-----------|---------|----------|-------------|
| `moodBenefitsWeight` | 20 | Mood Benefits Weight | Points for scientific mood explanation |
| `preferredCategoryWeight` | 10 | Preferred Category Weight | Points for preferred category match |
| `excludedCategoryPenalty` | 0 | Excluded Category Penalty | Negative points for excluded categories (0 = filter out) |
| `historicalDataWeight` | 15 | Historical Data Weight | Max points from historical success |
| `featuredItemWeight` | 5 | Featured Item Weight | Points for featured items |
| `timeOfDayWeight` | 5 | Time of Day Weight | Points for time-appropriate items |
| `explorationBonusWeight` | 8 | UCB Exploration Points | Max UCB exploration bonus |

### Learning Thresholds
| Parameter | Default | Description |
|-----------|---------|-------------|
| `minimumOrdersThreshold` | 10 | Orders needed before trusting Wilson Score data |
| `baselineThreshold` | 50 | Total orders before enabling feedback system |
| `orderRateWeight` | 0.6 | Weight for order rate in post-baseline combined score |
| `feedbackRateWeight` | 0.4 | Weight for improvement rate in combined score |
| `day0PositionShuffle` | true | Shuffle display order to prevent left-position bias |

### Time Configuration
| Parameter | Default | Description |
|-----------|---------|-------------|
| `morningStartHour` | 6 | Morning period start (24h format) |
| `morningEndHour` | 12 | Morning period end |
| `afternoonEndHour` | 18 | Afternoon period end (evening starts after) |
| `morningCategories` | `["HOT_DRINKS"]` | Categories boosted in morning |
| `afternoonCategories` | `[]` | Categories boosted in afternoon |
| `eveningCategories` | `["HOT_DRINKS", "PLATTER"]` | Categories boosted in evening |

### Feedback UI
| Parameter | Default | Description |
|-----------|---------|-------------|
| `showMoodReflection` | true | Show mood feedback popup after order |
| `reflectionDelayMinutes` | 5 | Minutes to wait before showing feedback |

---

## Implementation Details

### Key Source Files

| File | Purpose |
|------|---------|
| `BEEHIVE-FRONTEND/src/presentation/pages/client/MenuPage.tsx` | **Main scoring algorithm** - All scoring logic lives here |
| `BEEHIVE-FRONTEND/src/presentation/pages/admin/MoodSettingsPage.tsx` | Admin configuration & analytics dashboard |
| `BEEHIVE-BACKEND/src/repositories/moodSettings.repository.ts` | Backend data access for mood tracking |
| `BEEHIVE-BACKEND/prisma/schema.prisma` | Database schema definitions |

### Frontend Scoring Flow

```typescript
// 1. Get configuration
const scoringWeights = {
  moodBenefits: feedbackConfig?.moodBenefitsWeight ?? 20,
  preferredCategory: feedbackConfig?.preferredCategoryWeight ?? 10,
  excludedCategoryPenalty: feedbackConfig?.excludedCategoryPenalty ?? 0,
  historical: feedbackConfig?.historicalDataWeight ?? 15,
  featured: feedbackConfig?.featuredItemWeight ?? 5,
  timeOfDay: feedbackConfig?.timeOfDayWeight ?? 5,
  explorationBonus: feedbackConfig?.explorationBonusWeight ?? 8,
  minimumOrders: feedbackConfig?.minimumOrdersThreshold ?? 10
}

// 2. Filter excluded categories (if penalty = 0)
const useExcludedCategoryPenalty = scoringWeights.excludedCategoryPenalty > 0
const recommended = menuItems.filter(item => {
  if (!useExcludedCategoryPenalty && moodConfig.excludeCategories?.includes(item.category)) {
    return false  // Filter out
  }
  return item.available
})

// 3. Calculate total exposures for UCB
const totalExposures = Array.from(moodItemStats.values())
  .reduce((sum, stat) => sum + (stat.timesShown || 0), 0)

// 4. Score each item
const scoredItems = recommended.map(item => {
  let score = 0
  
  // Factor 1: Mood Benefits
  if (getMoodExplanation(item.name, selectedMood, item.moodBenefits)) {
    score += scoringWeights.moodBenefits
  }
  
  // Factor 2: Preferred Category
  if (moodConfig.preferredCategories?.includes(item.category)) {
    score += scoringWeights.preferredCategory
  }
  
  // Factor 2b: Excluded Category Penalty (if penalty > 0)
  if (useExcludedCategoryPenalty && moodConfig.excludeCategories?.includes(item.category)) {
    score -= scoringWeights.excludedCategoryPenalty
  }
  
  // Factor 3: Historical Success (3-stage)
  // ... (detailed implementation above)
  
  // Factor 4: Featured
  if (item.featured) score += scoringWeights.featured
  
  // Factor 5: Time of Day
  // ... (time context matching)
  
  return { item, score }
})

// 5. Tiebreaker shuffle for equal scores
const shuffledItems = shuffleEqualScores(scoredItems)

// 6. Get top 8 and apply position shuffle
let topRecommended = shuffledItems.slice(0, 8).map(s => s.item)

// 7. Day 0 Position Shuffle (prevents left-position bias)
if (feedbackConfig?.day0PositionShuffle ?? true) {
  // Fisher-Yates shuffle for display order
  for (let i = topRecommended.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [topRecommended[i], topRecommended[j]] = [topRecommended[j], topRecommended[i]]
  }
}

return topRecommended
```

### Tracking Flow

```
1. Customer selects mood
2. Frontend calls trackMoodShown(mood, itemIds)
3. Backend increments timesShown for each item
4. Customer orders item
5. Order controller increments timesOrdered
6. (Optional) Customer provides feedback
7. Backend updates moodImproved/Same/Worse counts
```

---

## Database Schema

### menu_item_mood_stats (Primary ML Table)
```prisma
model menu_item_mood_stats {
  id            String   @id @default(cuid())
  menuItemId    String
  mood          String
  timesShown    Int      @default(0)   // Denominator for order rate
  timesOrdered  Int      @default(0)   // Numerator for order rate
  moodImproved  Int      @default(0)   // Feedback: mood got better
  moodSame      Int      @default(0)   // Feedback: no change
  moodWorse     Int      @default(0)   // Feedback: mood got worse
  feedbackCount Int      @default(0)   // Total feedback responses
  updatedAt     DateTime @updatedAt
  
  menuItem      menu_items @relation(fields: [menuItemId], references: [id])
  
  @@unique([menuItemId, mood])  // One record per item per mood
}
```

### mood_order_stats (Aggregate per mood)
```prisma
model mood_order_stats {
  id            String   @id @default(cuid())
  mood          String   @unique
  timesShown    Int      @default(0)
  timesOrdered  Int      @default(0)
  moodImproved  Int      @default(0)
  moodSame      Int      @default(0)
  moodWorse     Int      @default(0)
  feedbackCount Int      @default(0)
  updatedAt     DateTime @updatedAt
}
```

### mood_feedback_config (Algorithm Configuration)
```prisma
model mood_feedback_config {
  id                        String   @id @default(cuid())
  baselineThreshold         Int      @default(50)
  feedbackEnabled           Boolean  @default(false)
  autoEnableFeedback        Boolean  @default(true)
  orderRateWeight           Float    @default(0.6)
  feedbackRateWeight        Float    @default(0.4)
  moodBenefitsWeight        Int      @default(20)
  preferredCategoryWeight   Int      @default(10)
  featuredItemWeight        Int      @default(5)
  priceRangeWeight          Int      @default(0)
  historicalDataWeight      Int      @default(15)
  timeOfDayWeight           Int      @default(5)
  explorationBonusWeight    Int      @default(8)
  minimumOrdersThreshold    Int      @default(10)
  morningStartHour          Int      @default(6)
  morningEndHour            Int      @default(12)
  afternoonEndHour          Int      @default(18)
  morningCategories         String   @default("[\"HOT_DRINKS\"]")
  afternoonCategories       String   @default("[]")
  eveningCategories         String   @default("[\"HOT_DRINKS\",\"PLATTER\"]")
  showMoodReflection        Boolean  @default(true)
  reflectionDelayMinutes    Int      @default(5)
  createdAt                 DateTime @default(now())
  updatedAt                 DateTime @updatedAt
}
```

---

## Appendix: Formulas

### Complete Scoring Formula

```
TotalScore(item, mood, time) = 
    HasMoodBenefits(item, mood) × moodBenefitsWeight
  + InPreferredCategory(item, mood) × preferredCategoryWeight
  + HistoricalScore(item, mood)
  + IsFeatured(item) × featuredItemWeight
  + IsTimeAppropriate(item, time) × timeOfDayWeight
  + ExplorationBonus(item)
```

### Historical Score by Stage

```
HistoricalScore(item, mood) = 
  
  IF timesOrdered < minimumOrdersThreshold:
    // Day 0: Neutral score (exploration bonus added separately)
    historicalDataWeight / 2
  
  ELSE IF feedbackEnabled = false:
    // Baseline: Order rate only with Wilson Score confidence
    WilsonScore(timesOrdered, timesShown) × historicalDataWeight
  
  ELSE:
    // Post-Baseline: Combined order rate + improvement rate
    [(WilsonScore(orders, shown) × orderRateWeight) + 
     (WilsonScore(moodImproved, feedbackCount) × feedbackRateWeight)]
    × historicalDataWeight

// Note: Exploration bonus is added to ALL items regardless of stage
// (see UCB formula below)
```

### Wilson Score Lower Bound (95% Confidence)

```
W(p̂, n) = (p̂ + 1.92/n - 1.96√(p̂(1-p̂)/n + 0.96/n²)) / (1 + 3.84/n)

Where:
  p̂ = successes / total (observed rate)
  n = total (sample size)
  z = 1.96 (95% confidence z-score)
```

### UCB Exploration Bonus

```
UCB(item) = min(
  √(2 × ln(totalExposures + 1) / itemExposures) × 1.5,
  explorationBonusWeight
)
```

### Score Calculation Examples by Stage

The following examples show how the algorithm calculates scores at each stage of learning, using the same item across different stages. All examples use **default weights**: moodBenefits=20, preferredCategory=10, historical=15, featured=5, timeOfDay=5, explorationBonus=8, minimumOrders=10.

---

#### **Stage 1: Day 0 (Insufficient Data)**

**Scenario**: Customer selects "Happy" mood at 8 PM (evening)

**Item**: Matcha Latte (New Item)
- Has scientific explanation for "happy" mood ✓
- Category: COLD_DRINKS (preferred for happy) ✓
- **Only 3 orders out of 15 shown** (< 10 minimum threshold)
- Featured: No
- Category in eveningCategories: No
- Total exposures across all items: 500

**Code Path** (from `MenuPage.tsx` lines 604-612):
```typescript
if (!itemStats || (itemStats.timesOrdered || 0) < MINIMUM_ORDERS_THRESHOLD) {
  // FIX #2: Not enough data yet → use neutral score
  score += NEUTRAL_HISTORICAL_SCORE  // historical / 2 = 15 / 2 = 7.5
  
  // FIX #3: Add exploration bonus for items with little exposure
  score += calculateExplorationBonus(itemExposures, totalExposures, MAX_EXPLORATION_BONUS)
}
```

**Calculation**:

| Factor | Formula | Calculation | Points |
|--------|---------|-------------|--------|
| Mood Benefits | Has scientific explanation | ✓ Has explanation | **+20.00** |
| Preferred Category | Category in preferredCategories | COLD_DRINKS ∈ ["COLD_DRINKS", "DESSERT"] | **+10.00** |
| Historical | `historical / 2` (neutral) | 15 / 2 | **+7.50** |
| Featured | item.featured | false | +0.00 |
| Time of Day | Category in eveningCategories | COLD_DRINKS ∉ ["HOT_DRINKS", "PLATTER"] | +0.00 |
| Exploration Bonus | `min(√(2×ln(501)/15) × 8, 8)` | min(√(12.43/15) × 8, 8) = min(7.28, 8) | **+7.28** |
| **TOTAL** | | | **44.78** |

**Key Point**: Day 0 items get neutral historical score (7.5) + exploration bonus (up to 8) instead of 0, ensuring fair treatment for new items.

---

#### **Stage 2: Data Collection (Order Rate Only)**

**Scenario**: Same customer, same mood, same time

**Item**: Matcha Latte (Established, no mood feedback yet)
- Has scientific explanation for "happy" mood ✓
- Category: COLD_DRINKS (preferred for happy) ✓
- **25 orders out of 120 shown** (≥ 10 minimum threshold)
- Raw order rate: 25/120 = 20.83%
- Featured: No
- Category in eveningCategories: No
- feedbackEnabled: **false** (baseline stage)
- Total exposures: 1000

**Code Path** (from `MenuPage.tsx` lines 626-628):
```typescript
if (!baselineReached) {
  // Before baseline: Use only order rate (100% weight)
  historicalScore = orderRate * scoringWeights.historical
}
```

**Wilson Score Calculation** (from `MenuPage.tsx` lines 489-500):
```
Wilson Score Formula: W(p, n) = (p + z²/2n - z√(p(1-p)/n + z²/4n²)) / (1 + z²/n)

Where:
  p = 25/120 = 0.2083 (raw rate)
  n = 120 (sample size)
  z = 1.96 (95% confidence)

Step-by-step:
  z²/n = 3.84/120 = 0.032
  z²/2n = 1.92/120 = 0.016
  z²/4n² = 0.96/14400 = 0.0000667
  
  center = 0.2083 + 0.016 = 0.2243
  margin = 1.96 × √(0.2083×0.7917/120 + 0.0000667)
        = 1.96 × √(0.001375 + 0.0000667)
        = 1.96 × 0.038 = 0.0745
  
  Wilson = (0.2243 - 0.0745) / (1 + 0.032) = 0.1498 / 1.032 = 0.145
```

**Calculation**:

| Factor | Formula | Calculation | Points |
|--------|---------|-------------|--------|
| Mood Benefits | Has scientific explanation | ✓ Has explanation | **+20.00** |
| Preferred Category | Category in preferredCategories | COLD_DRINKS ∈ ["COLD_DRINKS", "DESSERT"] | **+10.00** |
| Historical | `wilsonScore × historical` | 0.145 × 15 | **+2.18** |
| Featured | item.featured | false | +0.00 |
| Time of Day | Category in eveningCategories | COLD_DRINKS ∉ ["HOT_DRINKS", "PLATTER"] | +0.00 |
| Exploration Bonus | `min(√(2×ln(1001)/120) × 8, 8)` | min(√(13.82/120) × 8, 8) = min(2.71, 8) | **+2.71** |
| **TOTAL** | | | **34.89** |

**Key Point**: Wilson Score (0.145) is lower than raw rate (0.208) because with only 120 samples, we're being conservative about the true rate.

---

#### **Stage 3: Feedback-Enabled (60% Order + 40% Improvement)**

**Scenario**: Same customer, same mood, same time

**Item**: Matcha Latte (Mature, with mood feedback)
- Has scientific explanation for "happy" mood ✓
- Category: COLD_DRINKS (preferred for happy) ✓
- **45 orders out of 200 shown** (order rate: 22.5%)
- **28 mood improved out of 35 feedback** (improvement rate: 80%)
- Featured: No
- Category in eveningCategories: No
- feedbackEnabled: **true** (post-baseline stage)
- orderRateWeight: 0.6, feedbackRateWeight: 0.4
- Total exposures: 1500

**Code Path** (from `MenuPage.tsx` lines 630-638):
```typescript
if (baselineReached) {
  // After baseline: Use combined formula with mood improvement
  const improvementRate = wilsonScore(moodImproved, feedbackCount)
  const combinedRate = (orderRate * orderRateWeight) + (improvementRate * feedbackRateWeight)
  historicalScore = combinedRate * scoringWeights.historical
}
```

**Wilson Score Calculations**:

**Order Rate Wilson Score**:
```
p = 45/200 = 0.225, n = 200
Wilson(0.225, 200) = 0.172
```

**Improvement Rate Wilson Score**:
```
p = 28/35 = 0.80, n = 35
Wilson(0.80, 35) = 0.636
```

**Combined Rate**:
```
combinedRate = (0.172 × 0.6) + (0.636 × 0.4)
            = 0.1032 + 0.2544
            = 0.3576
```

**Calculation**:

| Factor | Formula | Calculation | Points |
|--------|---------|-------------|--------|
| Mood Benefits | Has scientific explanation | ✓ Has explanation | **+20.00** |
| Preferred Category | Category in preferredCategories | COLD_DRINKS ∈ ["COLD_DRINKS", "DESSERT"] | **+10.00** |
| Historical | `combinedRate × historical` | 0.3576 × 15 | **+5.36** |
| Featured | item.featured | false | +0.00 |
| Time of Day | Category in eveningCategories | COLD_DRINKS ∉ ["HOT_DRINKS", "PLATTER"] | +0.00 |
| Exploration Bonus | `min(√(2×ln(1501)/200) × 8, 8)` | min(√(14.62/200) × 8, 8) = min(2.16, 8) | **+2.16** |
| **TOTAL** | | | **37.52** |

**Key Point**: The high mood improvement rate (80% → Wilson 0.636) significantly boosts the historical score, even though order rate alone (17.2%) was modest. This rewards items that actually make customers feel better.

---

#### **Stage Comparison Summary**

| Stage | Historical Score | Exploration Bonus | Total Score | Key Feature |
|-------|------------------|-------------------|-------------|-------------|
| **Cold-Start** | 7.50 (neutral) | 7.28 (high) | 44.78 | Fair start, no penalty |
| **Data Collection** | 2.18 (orders only) | 2.71 (moderate) | 34.89 | Wilson Score confidence |
| **Feedback-Enabled** | 5.36 (60/40 combo) | 2.16 (low) | 37.52 | Mood improvement boost |

**Why Feedback-Enabled > Data Collection**: The item has excellent mood improvement (80%), which the 60/40 formula rewards. Even though order rate is similar, customer satisfaction feedback significantly improves ranking.

---

### Why Three Phases Are Essential

The three-phase approach is **not optional**—it's a fundamental requirement for building a reliable recommendation system. Here's why each phase exists and what catastrophic failures occur without them:

---

#### Phase 1: Cold-Start (Neutral Priors)

**Purpose**: Ensure new items get fair exposure without being penalized for having no data.

**What happens WITHOUT this phase**:
```
❌ FAILURE SCENARIO: New Menu Item Launch

Day 1: You add "Honey Lavender Latte" to the menu
- No orders yet → timesOrdered = 0
- No exposures yet → timesShown = 0
- Order rate = 0/0 = undefined (or 0%)
- Historical score = 0 × 15 = 0 points

Result: "Honey Lavender Latte" gets ZERO historical points
        while old items have 5-15 points advantage.
        New item never gets shown → never gets ordered → 
        stuck in a death spiral.
        
Your new seasonal menu item NEVER gets discovered!
```

**With Cold-Start phase**:
```
✅ CORRECT BEHAVIOR:

Day 1: "Honey Lavender Latte" is added
- No orders → neutral prior applied
- Historical score = 0.5 × 15 = 7.5 points (middle ground)
- Plus high UCB exploration bonus = +7.28 points

Result: New item competes fairly with established items.
        Gets shown, gets ordered, builds its own reputation.
```

---

#### Phase 2: Data Collection (Order Rate Only)

**Purpose**: Build reliable baseline data using objective, easy-to-collect metrics before introducing subjective feedback.

**What happens WITHOUT this phase**:
```
❌ FAILURE SCENARIO: Premature Feedback Integration

Week 1: You have 50 total orders across menu
- 3 customers gave mood feedback
- "Iced Coffee" got 2 positive feedbacks (66% improvement rate)
- "Matcha Latte" got 1 negative feedback (0% improvement rate)

With feedback immediately factored in:
- Iced Coffee: combined = (0.15 × 0.6) + (0.66 × 0.4) = 0.354 → 5.3 points
- Matcha Latte: combined = (0.20 × 0.6) + (0.00 × 0.4) = 0.120 → 1.8 points

Result: Matcha Latte is now ranked LAST despite having 
        better order rate (20% vs 15%) because ONE PERSON
        said their mood didn't improve!
        
Statistical noise from 3 feedback responses is controlling
your entire recommendation system!
```

**With Data Collection phase**:
```
✅ CORRECT BEHAVIOR:

Week 1-8: Build order data (objective, automatic)
- Order rate is collected passively on every order
- No subjective bias from mood-of-the-moment responses
- Wilson Score ensures we wait for statistical confidence

Week 8+: Once baselineThreshold (50+ feedback) reached
- NOW integrate mood feedback with confidence
- 50+ data points smooths out individual variance
```

---

#### Phase 3: Feedback-Enabled (Combined 60/40)

**Purpose**: Incorporate customer satisfaction data for superior personalization—but only when statistically reliable.

**What happens WITHOUT this phase** (i.e., never using feedback):
```
❌ FAILURE SCENARIO: Order Rate ≠ Customer Satisfaction

"Energy Drink Red Bull" data:
- Order rate: 35% (customers buy it often)
- Mood improvement: 15% (often makes them jittery/anxious)

"Chamomile Tea" data:
- Order rate: 12% (less popular)
- Mood improvement: 85% (very effective for relaxation)

If you ONLY use order rate forever:
- Energy Drink always ranks higher (35% > 12%)
- Customers selecting "stressed" mood get recommended 
  something that makes them MORE stressed!

Result: Your "mood-based" recommendation system isn't 
        actually improving moods—it's just showing popular items.
        Defeats the entire purpose of mood-aware recommendations!
```

**With Feedback-Enabled phase**:
```
✅ CORRECT BEHAVIOR:

For "stressed" mood with 60% order / 40% improvement weights:
- Energy Drink: (0.35 × 0.6) + (0.15 × 0.4) = 0.27 → 4.0 pts
- Chamomile Tea: (0.12 × 0.6) + (0.85 × 0.4) = 0.41 → 6.2 pts

Result: Chamomile Tea ranks HIGHER despite lower popularity
        because it actually HELPS the customer's mood!
```

---

#### Summary: Phase Transition Rules

| Phase | Entry Condition | Exit Condition | Primary Metric |
|-------|-----------------|----------------|----------------|
| **Cold-Start** | timesShown < minimumOrdersThreshold (10) | timesShown ≥ 10 | Neutral prior (0.5) |
| **Data Collection** | timesShown ≥ 10 | feedbackCount ≥ baselineThreshold (50) | Order rate only |
| **Feedback-Enabled** | feedbackCount ≥ 50 | Never (permanent) | 60% order + 40% feedback |

**Key Insight**: Each phase addresses a specific statistical problem:
- **Cold-Start** → Solves "no data" problem
- **Data Collection** → Solves "insufficient sample size" problem  
- **Feedback-Enabled** → Solves "popularity ≠ satisfaction" problem

Without all three phases, your system will either:
1. **Bury new items** (no cold-start handling)
2. **Overfit to noise** (premature feedback use)
3. **Ignore satisfaction** (never using feedback)

---

## Capstone Defense Q&A Preparation

### Q: Why use Wilson Score instead of simple averages?
**A**: Simple averages are misleading with small samples. An item with 5/5 orders (100%) appears better than 450/500 (90%), but the latter has much more statistical confidence. Wilson Score accounts for sample size uncertainty, giving conservative estimates that reflect our true confidence level.

### Q: What is the "cold start" problem and how does your system solve it?
**A**: Cold start occurs when new items have no historical data and get unfairly penalized (0 points). Our solution:
1. **Neutral Score**: Cold-start items get 7.5/15 historical points instead of 0
2. **UCB Exploration**: Under-exposed items get bonus points (up to 8 pts, ~12.7% of max score) to encourage trying them
3. **Tiebreaker Shuffle**: Items with equal scores are randomized to prevent position bias

### Q: How does the system prevent "rich get richer" bias?
**A**: Through UCB (Upper Confidence Bound) exploration bonus. Items that have been shown fewer times get higher bonus points, ensuring every item gets fair exposure. The bonus decays logarithmically as items gain exposure.

### Q: Why have three stages of learning?
**A**: Each phase solves a specific statistical problem:
- **Cold-Start**: Prevents new items from getting stuck with 0 points (death spiral)
- **Data Collection**: Builds reliable baseline using objective order rate before adding subjective feedback
- **Feedback-Enabled**: Incorporates mood improvement data so satisfaction matters, not just popularity

### Q: How do you balance science vs. customer preference?
**A**: Through weighted scoring:
- **Scientific evidence** (mood benefits): 20 points max - highest priority
- **Customer behavior** (historical): 15 points max - significant but not dominant
- Both influence rankings, but evidence-based items always have an advantage

---

## References

- Wilson, E. B. (1927). "Probable inference, the law of succession, and statistical inference" - Journal of the American Statistical Association
- Auer, P., Cesa-Bianchi, N., & Fischer, P. (2002). "Finite-time Analysis of the Multiarmed Bandit Problem" - Machine Learning
- Reddit Hot/Best Ranking Algorithm - Practical application of Wilson Score for content ranking

---

## Technical Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL with Prisma ORM
- **Frontend**: React + TypeScript + Vite
- **Styling**: Tailwind CSS + shadcn/ui
- **Algorithm**: Wilson Score + UCB + Multi-factor weighted scoring

---

*Document Version: 2.0 (Post-Statistical Improvements)*  
*Last Updated: January 2025*  
*Authors: Beehive Development Team*
