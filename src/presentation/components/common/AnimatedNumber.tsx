import { useCountAnimation, formatCount, formatCurrency, easings } from '../../../shared/hooks/useCountAnimation'

interface AnimatedNumberProps {
  value: number
  duration?: number
  decimals?: number
  prefix?: string
  suffix?: string
  className?: string
  isCurrency?: boolean
  delay?: number
  easing?: keyof typeof easings
}

/**
 * A component that animates number changes with a counting effect
 */
export const AnimatedNumber = ({
  value,
  duration = 1000,
  decimals = 0,
  prefix = '',
  suffix = '',
  className = '',
  isCurrency = false,
  delay = 0,
  easing = 'easeOut'
}: AnimatedNumberProps) => {
  const animatedValue = useCountAnimation(value, {
    duration,
    decimals,
    delay,
    easing: easings[easing]
  })

  const displayValue = isCurrency 
    ? formatCurrency(animatedValue)
    : formatCount(animatedValue, decimals)

  return (
    <span className={className}>
      {prefix}{isCurrency ? displayValue : `${displayValue}${suffix}`}
    </span>
  )
}

export default AnimatedNumber
