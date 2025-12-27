import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Payment settings
  markPaidOnConfirmOrder: boolean
  markPaidOnPrintReceipt: boolean
  printReceiptOnConfirmOrder: boolean
  printKitchenCopy: boolean
  
  // Inventory settings
  autoOutOfStockWhenIngredientsRunOut: boolean
  showCurrentStockInPOS: boolean
  
  // Actions
  setMarkPaidOnConfirmOrder: (value: boolean) => void
  setMarkPaidOnPrintReceipt: (value: boolean) => void
  setPrintReceiptOnConfirmOrder: (value: boolean) => void
  setPrintKitchenCopy: (value: boolean) => void
  setAutoOutOfStockWhenIngredientsRunOut: (value: boolean) => void
  setShowCurrentStockInPOS: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default settings - Payment
      markPaidOnConfirmOrder: true,
      markPaidOnPrintReceipt: true,
      printReceiptOnConfirmOrder: false,
      printKitchenCopy: false,
      
      // Default settings - Inventory
      autoOutOfStockWhenIngredientsRunOut: false, // Default OFF - don't auto mark out of stock
      showCurrentStockInPOS: true, // Default ON - show stock in POS
      
      // Actions
      setMarkPaidOnConfirmOrder: (value: boolean) => 
        set({ markPaidOnConfirmOrder: value }),
      
      setMarkPaidOnPrintReceipt: (value: boolean) => 
        set({ markPaidOnPrintReceipt: value }),
      
      setPrintReceiptOnConfirmOrder: (value: boolean) => 
        set({ printReceiptOnConfirmOrder: value }),
      
      setPrintKitchenCopy: (value: boolean) => 
        set({ printKitchenCopy: value }),
        
      setAutoOutOfStockWhenIngredientsRunOut: (value: boolean) =>
        set({ autoOutOfStockWhenIngredientsRunOut: value }),
        
      setShowCurrentStockInPOS: (value: boolean) =>
        set({ showCurrentStockInPOS: value }),
    }),
    {
      name: 'beehive-settings',
    }
  )
)
