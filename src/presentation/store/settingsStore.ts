import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  markPaidOnConfirmOrder: boolean
  markPaidOnPrintReceipt: boolean
  printReceiptOnConfirmOrder: boolean
  setMarkPaidOnConfirmOrder: (value: boolean) => void
  setMarkPaidOnPrintReceipt: (value: boolean) => void
  setPrintReceiptOnConfirmOrder: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default settings
      markPaidOnConfirmOrder: true,
      markPaidOnPrintReceipt: true,
      printReceiptOnConfirmOrder: false,
      
      // Actions
      setMarkPaidOnConfirmOrder: (value: boolean) => 
        set({ markPaidOnConfirmOrder: value }),
      
      setMarkPaidOnPrintReceipt: (value: boolean) => 
        set({ markPaidOnPrintReceipt: value }),
      
      setPrintReceiptOnConfirmOrder: (value: boolean) => 
        set({ printReceiptOnConfirmOrder: value }),
    }),
    {
      name: 'beehive-settings',
    }
  )
)
