import { useState, useEffect, useRef } from 'react'
import { Calendar, ChevronDown } from 'lucide-react'
import { Button } from './ui/button'

export type DateFilterPreset = 'all' | 'today' | 'yesterday' | 'week' | 'month' | 'quarter' | 'year' | 'custom'

export interface DateFilterValue {
  preset: DateFilterPreset
  startDate: Date | null
  endDate: Date | null
}

interface DateFilterProps {
  value: DateFilterValue
  onChange: (value: DateFilterValue) => void
  showAllOption?: boolean
  className?: string
}

const PRESETS: { value: DateFilterPreset; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'week', label: 'Last 7 Days' },
  { value: 'month', label: 'Last 30 Days' },
  { value: 'quarter', label: 'Last Quarter' },
  { value: 'year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
]

export const getDateRangeFromPreset = (preset: DateFilterPreset): { startDate: Date | null; endDate: Date | null } => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfToday = new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)

  switch (preset) {
    case 'all':
      return { startDate: null, endDate: null }
    case 'today':
      return { startDate: today, endDate: endOfToday }
    case 'yesterday': {
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      const endOfYesterday = new Date(today.getTime() - 1)
      return { startDate: yesterday, endDate: endOfYesterday }
    }
    case 'week':
      return { startDate: new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000), endDate: endOfToday }
    case 'month':
      return { startDate: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000), endDate: endOfToday }
    case 'quarter':
      return { startDate: new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000), endDate: endOfToday }
    case 'year':
      return { startDate: new Date(today.getTime() - 365 * 24 * 60 * 60 * 1000), endDate: endOfToday }
    default:
      return { startDate: null, endDate: null }
  }
}

export const filterByDateRange = <T extends { createdAt?: string; completedAt?: string; date?: string }>(
  items: T[],
  dateFilter: DateFilterValue,
  dateField: 'createdAt' | 'completedAt' | 'date' = 'createdAt'
): T[] => {
  if (dateFilter.preset === 'all' && !dateFilter.startDate && !dateFilter.endDate) {
    return items
  }

  const { startDate, endDate } = dateFilter.preset === 'custom'
    ? { startDate: dateFilter.startDate, endDate: dateFilter.endDate }
    : getDateRangeFromPreset(dateFilter.preset)

  if (!startDate && !endDate) return items

  return items.filter(item => {
    const itemDateStr = dateField === 'date' 
      ? (item as any).date 
      : (item as any)[dateField] || (item as any).createdAt
    if (!itemDateStr) return false
    
    const itemDate = new Date(itemDateStr)
    
    if (startDate && itemDate < startDate) return false
    if (endDate && itemDate > endDate) return false
    
    return true
  })
}

export const DateFilter = ({ value, onChange, showAllOption = true, className = '' }: DateFilterProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const availablePresets = showAllOption 
    ? PRESETS 
    : PRESETS.filter(p => p.value !== 'all')

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (value.preset === 'custom' && value.startDate) {
      setCustomStart(value.startDate.toISOString().split('T')[0])
    }
    if (value.preset === 'custom' && value.endDate) {
      setCustomEnd(value.endDate.toISOString().split('T')[0])
    }
  }, [value])

  const handlePresetSelect = (preset: DateFilterPreset) => {
    if (preset === 'custom') {
      onChange({ preset, startDate: value.startDate, endDate: value.endDate })
    } else {
      const { startDate, endDate } = getDateRangeFromPreset(preset)
      onChange({ preset, startDate, endDate })
      setIsOpen(false)
    }
  }

  const handleCustomDateChange = () => {
    if (customStart && customEnd) {
      const start = new Date(customStart)
      const end = new Date(customEnd)
      end.setHours(23, 59, 59, 999)
      onChange({ preset: 'custom', startDate: start, endDate: end })
      setIsOpen(false)
    }
  }

  const getDisplayLabel = () => {
    if (value.preset === 'custom' && value.startDate && value.endDate) {
      return `${value.startDate.toLocaleDateString()} - ${value.endDate.toLocaleDateString()}`
    }
    return availablePresets.find(p => p.value === value.preset)?.label || 'Select Date'
  }

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <Button
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 min-w-[160px] justify-between"
      >
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-gray-500" />
          <span className="text-sm">{getDisplayLabel()}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2">
            {availablePresets.map(preset => (
              <button
                key={preset.value}
                onClick={() => handlePresetSelect(preset.value)}
                className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors ${
                  value.preset === preset.value 
                    ? 'bg-amber-100 text-amber-800' 
                    : 'hover:bg-gray-100'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {value.preset === 'custom' && (
            <div className="border-t border-gray-200 p-3 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>
              <Button
                onClick={handleCustomDateChange}
                disabled={!customStart || !customEnd}
                className="w-full"
                style={{ backgroundColor: '#F9C900', color: '#000' }}
              >
                Apply Range
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const useDefaultDateFilter = (defaultPreset: DateFilterPreset = 'week'): DateFilterValue => {
  const { startDate, endDate } = getDateRangeFromPreset(defaultPreset)
  return { preset: defaultPreset, startDate, endDate }
}
