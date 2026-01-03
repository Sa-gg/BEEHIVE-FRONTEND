import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface SettingsState {
  // Payment settings
  markPaidOnConfirmOrder: boolean
  markPaidOnPrintReceipt: boolean
  printReceiptOnConfirmOrder: boolean
  printKitchenCopy: boolean
  autoPrintOnReceiptButton: boolean // Auto-print when clicking any print receipt button
  cashChangeEnabled: boolean // Show cash/change modal when marking orders as paid
  
  // Inventory settings
  autoOutOfStockWhenIngredientsRunOut: boolean
  showCurrentStockInPOS: boolean
  
  // Cashier permissions - whether actions require manager PIN
  cashierCanVoidWithoutPin: boolean
  cashierCanRefundWithoutPin: boolean
  cashierCanComplimentaryWithoutPin: boolean
  cashierCanWriteOffWithoutPin: boolean
  cashierCanVoidAndReorderWithoutPin: boolean
  
  // Actions
  setMarkPaidOnConfirmOrder: (value: boolean) => void
  setMarkPaidOnPrintReceipt: (value: boolean) => void
  setPrintReceiptOnConfirmOrder: (value: boolean) => void
  setPrintKitchenCopy: (value: boolean) => void
  setAutoPrintOnReceiptButton: (value: boolean) => void
  setCashChangeEnabled: (value: boolean) => void
  setAutoOutOfStockWhenIngredientsRunOut: (value: boolean) => void
  setShowCurrentStockInPOS: (value: boolean) => void
  setCashierCanVoidWithoutPin: (value: boolean) => void
  setCashierCanRefundWithoutPin: (value: boolean) => void
  setCashierCanComplimentaryWithoutPin: (value: boolean) => void
  setCashierCanWriteOffWithoutPin: (value: boolean) => void
  setCashierCanVoidAndReorderWithoutPin: (value: boolean) => void
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      // Default settings - Payment
      markPaidOnConfirmOrder: true,
      markPaidOnPrintReceipt: true,
      printReceiptOnConfirmOrder: false,
      printKitchenCopy: false,
      autoPrintOnReceiptButton: true, // Default ON - auto print when clicking receipt buttons
      cashChangeEnabled: true, // Default ON - show cash/change modal for CASH payments
      
      // Default settings - Inventory
      autoOutOfStockWhenIngredientsRunOut: false, // Default OFF - don't auto mark out of stock
      showCurrentStockInPOS: true, // Default ON - show stock in POS
      
      // Default settings - Cashier permissions (all require PIN by default)
      cashierCanVoidWithoutPin: false,
      cashierCanRefundWithoutPin: false,
      cashierCanComplimentaryWithoutPin: false,
      cashierCanWriteOffWithoutPin: false,
      cashierCanVoidAndReorderWithoutPin: false,
      
      // Actions
      setMarkPaidOnConfirmOrder: (value: boolean) => 
        set({ markPaidOnConfirmOrder: value }),
      
      setMarkPaidOnPrintReceipt: (value: boolean) => 
        set({ markPaidOnPrintReceipt: value }),
      
      setPrintReceiptOnConfirmOrder: (value: boolean) => 
        set({ printReceiptOnConfirmOrder: value }),
      
      setPrintKitchenCopy: (value: boolean) => 
        set({ printKitchenCopy: value }),
      
      setAutoPrintOnReceiptButton: (value: boolean) =>
        set({ autoPrintOnReceiptButton: value }),
      
      setCashChangeEnabled: (value: boolean) =>
        set({ cashChangeEnabled: value }),
        
      setAutoOutOfStockWhenIngredientsRunOut: (value: boolean) =>
        set({ autoOutOfStockWhenIngredientsRunOut: value }),
        
      setShowCurrentStockInPOS: (value: boolean) =>
        set({ showCurrentStockInPOS: value }),
        
      setCashierCanVoidWithoutPin: (value: boolean) =>
        set({ cashierCanVoidWithoutPin: value }),
        
      setCashierCanRefundWithoutPin: (value: boolean) =>
        set({ cashierCanRefundWithoutPin: value }),
        
      setCashierCanComplimentaryWithoutPin: (value: boolean) =>
        set({ cashierCanComplimentaryWithoutPin: value }),
        
      setCashierCanWriteOffWithoutPin: (value: boolean) =>
        set({ cashierCanWriteOffWithoutPin: value }),
        
      setCashierCanVoidAndReorderWithoutPin: (value: boolean) =>
        set({ cashierCanVoidAndReorderWithoutPin: value }),
    }),
    {
      name: 'beehive-settings',
    }
  )
)
