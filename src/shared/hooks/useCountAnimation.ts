import { useState, useEffect, useRef } from 'react'

type EasingFunction = (progress: number) => number

interface UseCountAnimationOptions {
  duration?: number
  easing?: EasingFunction
  decimals?: number
  start?: number
  delay?: number
}

// Easing functions
const easings = {
  linear: (t: number) => t,
  easeOut: (t: number) => 1 - Math.pow(1 - t, 3),
  easeIn: (t: number) => Math.pow(t, 3),
  easeInOut: (t: number) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2,
}

// Format functions
const formatCount = (value: number, decimals: number = 0): string => {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

export const useCountAnimation = (
  end: number,
  options: UseCountAnimationOptions = {}
): number => {
  const {
    duration = 1000,
    easing = easings.easeOut,
    decimals = 0,
    start = 0,
    delay = 0
  } = options

  const [count, setCount] = useState(start)
  const animationRef = useRef<number | null>(null)
  const previousEndRef = useRef<number>(0)
  const hasAnimatedRef = useRef(false)

  useEffect(() => {
    // Cancel any existing animation
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }

    const endValue = end
    const startValue = hasAnimatedRef.current ? previousEndRef.current : 0

    // Skip animation if values are the same
    if (startValue === endValue && hasAnimatedRef.current) {
      return
    }

    let startTime: number | null = null
    let delayTimeout: ReturnType<typeof setTimeout> | null = null

    const animate = (currentTime: number) => {
      if (startTime === null) {
        startTime = currentTime
      }
      
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const easedProgress = easing(progress)
      const currentValue = startValue + (endValue - startValue) * easedProgress
      
      setCount(Number(currentValue.toFixed(decimals)))

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate)
      } else {
        // Animation complete - update tracking refs
        previousEndRef.current = endValue
        hasAnimatedRef.current = true
        animationRef.current = null
      }
    }

    const startAnimation = () => {
      animationRef.current = requestAnimationFrame(animate)
    }

    if (delay > 0) {
      delayTimeout = setTimeout(startAnimation, delay)
    } else {
      startAnimation()
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
      if (delayTimeout) {
        clearTimeout(delayTimeout)
      }
    }
  }, [end, duration, decimals, delay, easing])

  return count
}

export { easings, formatCount, formatCurrency }
export type { UseCountAnimationOptions, EasingFunction }
