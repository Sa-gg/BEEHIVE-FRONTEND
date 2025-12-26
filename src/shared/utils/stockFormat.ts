/**
 * Smart Stock Unit Formatting Utilities
 * 
 * Formats stock quantities in a more readable way using appropriate units.
 * For example: 10.216 kg becomes "10kg & 216g"
 */

interface UnitConversion {
  baseUnit: string
  subUnit: string
  conversionFactor: number
}

// Define unit conversions
const UNIT_CONVERSIONS: Record<string, UnitConversion> = {
  // Weight units
  'kg': { baseUnit: 'kg', subUnit: 'g', conversionFactor: 1000 },
  'g': { baseUnit: 'g', subUnit: 'mg', conversionFactor: 1000 },
  // Volume units
  'L': { baseUnit: 'L', subUnit: 'ml', conversionFactor: 1000 },
  'l': { baseUnit: 'L', subUnit: 'ml', conversionFactor: 1000 },
  'liter': { baseUnit: 'L', subUnit: 'ml', conversionFactor: 1000 },
  'liters': { baseUnit: 'L', subUnit: 'ml', conversionFactor: 1000 },
  'ml': { baseUnit: 'ml', subUnit: 'ml', conversionFactor: 1 }, // No sub-unit for ml
}

/**
 * Format a stock value with smart unit display
 * Converts decimal values to compound format (e.g., 10.216 kg → "10kg & 216g")
 * 
 * @param value - The stock quantity value
 * @param unit - The unit of measurement (kg, g, L, ml, etc.)
 * @param maxDecimals - Maximum decimal places if no conversion available
 * @returns Formatted string
 */
export function formatSmartStock(value: number, unit: string, maxDecimals: number = 2): string {
  // Handle null/undefined
  if (value === null || value === undefined || isNaN(value)) {
    return `0 ${unit}`
  }

  // Get unit conversion if available
  const conversion = UNIT_CONVERSIONS[unit.toLowerCase()]
  
  // If no conversion available or value is a whole number, format normally
  if (!conversion || conversion.conversionFactor === 1 || Number.isInteger(value)) {
    const formatted = Number.isInteger(value) ? value.toString() : value.toFixed(maxDecimals)
    return `${formatted} ${unit}`
  }

  // Calculate whole and fractional parts
  const wholePart = Math.floor(value)
  const fractionalPart = value - wholePart
  
  // Convert fractional part to sub-units
  const subUnitValue = Math.round(fractionalPart * conversion.conversionFactor)
  
  // If fractional part is negligible, just return whole units
  if (subUnitValue === 0 || subUnitValue >= conversion.conversionFactor) {
    const adjustedWhole = subUnitValue >= conversion.conversionFactor ? wholePart + 1 : wholePart
    return `${adjustedWhole}${conversion.baseUnit}`
  }
  
  // If no whole part, just return sub-units
  if (wholePart === 0) {
    return `${subUnitValue}${conversion.subUnit}`
  }
  
  // Return compound format
  return `${wholePart}${conversion.baseUnit} & ${subUnitValue}${conversion.subUnit}`
}

/**
 * Format stock value with a short format (for compact displays)
 * Shows just the primary unit with decimal
 * 
 * @param value - The stock quantity value
 * @param unit - The unit of measurement
 * @returns Short formatted string
 */
export function formatStockShort(value: number, unit: string): string {
  if (value === null || value === undefined || isNaN(value)) {
    return `0 ${unit}`
  }
  
  // Format to 2 decimal places max, removing trailing zeros
  const formatted = parseFloat(value.toFixed(2)).toString()
  return `${formatted} ${unit}`
}

/**
 * Parse a smart stock string back to numeric value
 * Handles formats like "10kg & 216g" → 10.216
 * 
 * @param stockString - The formatted stock string
 * @returns Numeric value in base units
 */
export function parseSmartStock(stockString: string): { value: number; unit: string } | null {
  if (!stockString) return null
  
  // Try to match compound format: "10kg & 216g"
  const compoundMatch = stockString.match(/(\d+)\s*(\w+)\s*&\s*(\d+)\s*(\w+)/)
  if (compoundMatch) {
    const [, mainValue, mainUnit, subValue, subUnit] = compoundMatch
    const conversion = UNIT_CONVERSIONS[mainUnit.toLowerCase()]
    if (conversion) {
      const total = parseFloat(mainValue) + (parseFloat(subValue) / conversion.conversionFactor)
      return { value: total, unit: mainUnit }
    }
  }
  
  // Try to match simple format: "10 kg"
  const simpleMatch = stockString.match(/(\d+(?:\.\d+)?)\s*(\w+)/)
  if (simpleMatch) {
    return { value: parseFloat(simpleMatch[1]), unit: simpleMatch[2] }
  }
  
  return null
}

/**
 * Get the appropriate unit display for a stock level
 * Uses larger units for large values, smaller units for small values
 * 
 * @param value - The stock quantity
 * @param unit - The base unit
 * @returns Best unit to display
 */
export function getBestDisplayUnit(value: number, unit: string): { value: number; unit: string } {
  const conversion = UNIT_CONVERSIONS[unit.toLowerCase()]
  
  if (!conversion) {
    return { value, unit }
  }
  
  // If value is very small (less than 1), convert to sub-units
  if (value < 1 && conversion.subUnit !== conversion.baseUnit) {
    return {
      value: value * conversion.conversionFactor,
      unit: conversion.subUnit
    }
  }
  
  return { value, unit: conversion.baseUnit }
}
