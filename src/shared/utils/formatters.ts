/**
 * Format a number as currency (Philippine Peso) with max 2 decimal places
 */
export const formatCurrency = (value: number): string => {
  return `₱${value.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format a number with max 2 decimal places
 */
export const formatNumber = (value: number, decimals: number = 2): string => {
  return value.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: decimals })
}

/**
 * Format a cost/price value (max 2 decimal places)
 */
export const formatPrice = (value: number): string => {
  return value.toFixed(2)
}

/**
 * Round a number to max 2 decimal places
 */
export const roundTo2Decimals = (value: number): number => {
  return Math.round(value * 100) / 100
}
