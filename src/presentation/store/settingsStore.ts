import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SeparatorDirection = 'off' | 'horizontal' | 'vertical'
export type POSMobileCardSize = 'small' | 'medium' | 'large'

interface SettingsState {
  // Payment settings
  markPaidOnPrintReceipt: boolean
  cashChangeEnabled: boolean // Show cash/change modal when marking orders as paid
  
  // Printing settings
  printKitchenCopy: boolean
  printKitchenCopyForOpenTab: boolean // Print kitchen copy when clicking Open Tab button
  autoPrintOnReceiptButton: boolean // Auto-print when clicking any print receipt button
  
  // Toast settings
  toastDurationSeconds: number // How many seconds toast notifications appear
  maxToastNotifications: number // Maximum number of toast notifications visible at once
  
  // Inventory settings
  autoOutOfStockWhenIngredientsRunOut: boolean
  showCurrentStockInPOS: boolean
  
  // UI settings - Orders Page
  showHeaderInOrdersPage: boolean
  showOverviewCardsInOrdersPage: boolean
  showOverviewInHeaderOrdersPage: boolean // Show overview counts in header
  statusSeparatorDirection: SeparatorDirection // off, horizontal, or vertical (3 columns)
  
  // UI settings - POS Page Mobile
  posMobileColumnsPerRow: number // 1, 2, 3, or 4 columns per row in mobile view
  posMobileCardSize: POSMobileCardSize // small, medium, or large card size
  
  // Cashier permissions - whether actions require manager PIN
  cashierCanVoidWithoutPin: boolean
  cashierCanRefundWithoutPin: boolean
  cashierCanComplimentaryWithoutPin: boolean
  cashierCanWriteOffWithoutPin: boolean
  cashierCanVoidAndReorderWithoutPin: boolean
  
  // Actions
  setMarkPaidOnPrintReceipt: (value: boolean) => void
  setCashChangeEnabled: (value: boolean) => void
  setPrintKitchenCopy: (value: boolean) => void
  setPrintKitchenCopyForOpenTab: (value: boolean) => void
  setAutoPrintOnReceiptButton: (value: boolean) => void
  setToastDurationSeconds: (value: number) => void
  setMaxToastNotifications: (value: number) => void
  setAutoOutOfStockWhenIngredientsRunOut: (value: boolean) => void
  setShowCurrentStockInPOS: (value: boolean) => void
  setShowHeaderInOrdersPage: (value: boolean) => void
  setShowOverviewCardsInOrdersPage: (value: boolean) => void
  setShowOverviewInHeaderOrdersPage: (value: boolean) => void
  setStatusSeparatorDirection: (value: SeparatorDirection) => void
  setPosMobileColumnsPerRow: (value: number) => void
  setPosMobileCardSize: (value: POSMobileCardSize) => void
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
      markPaidOnPrintReceipt: true,
      cashChangeEnabled: true, // Default ON - show cash/change modal for CASH payments
      
      // Default settings - Printing
      printKitchenCopy: false,
      printKitchenCopyForOpenTab: false, // Default OFF - don't print kitchen copy for Open Tab
      autoPrintOnReceiptButton: true, // Default ON - auto print when clicking receipt buttons
      
      // Default settings - Toast
      toastDurationSeconds: 5, // Default 5 seconds
      maxToastNotifications: 3, // Default max 3 toasts
      
      // Default settings - Inventory
      autoOutOfStockWhenIngredientsRunOut: false, // Default OFF - don't auto mark out of stock
      showCurrentStockInPOS: true, // Default ON - show stock in POS
      
      // Default settings - UI Orders Page
      showHeaderInOrdersPage: true, // Default ON - show header
      showOverviewCardsInOrdersPage: true, // Default ON - show overview cards
      showOverviewInHeaderOrdersPage: false, // Default OFF - don't show overview in header
      statusSeparatorDirection: 'off', // Default OFF - use standard view without separators
      
      // Default settings - UI POS Page Mobile
      posMobileColumnsPerRow: 2, // Default 2 columns per row
      posMobileCardSize: 'medium' as POSMobileCardSize, // Default medium size
      
      // Default settings - Cashier permissions (all require PIN by default)
      cashierCanVoidWithoutPin: false,
      cashierCanRefundWithoutPin: false,
      cashierCanComplimentaryWithoutPin: false,
      cashierCanWriteOffWithoutPin: false,
      cashierCanVoidAndReorderWithoutPin: false,
      
      // Actions
      setMarkPaidOnPrintReceipt: (value: boolean) => 
        set({ markPaidOnPrintReceipt: value }),
      
      setCashChangeEnabled: (value: boolean) =>
        set({ cashChangeEnabled: value }),
      
      setPrintKitchenCopy: (value: boolean) => 
        set({ printKitchenCopy: value }),
      
      setPrintKitchenCopyForOpenTab: (value: boolean) =>
        set({ printKitchenCopyForOpenTab: value }),
      
      setAutoPrintOnReceiptButton: (value: boolean) =>
        set({ autoPrintOnReceiptButton: value }),
      
      setToastDurationSeconds: (value: number) =>
        set({ toastDurationSeconds: value }),
      
      setMaxToastNotifications: (value: number) =>
        set({ maxToastNotifications: value }),
        
      setAutoOutOfStockWhenIngredientsRunOut: (value: boolean) =>
        set({ autoOutOfStockWhenIngredientsRunOut: value }),
        
      setShowCurrentStockInPOS: (value: boolean) =>
        set({ showCurrentStockInPOS: value }),
        
      setShowHeaderInOrdersPage: (value: boolean) =>
        set({ showHeaderInOrdersPage: value }),
        
      setShowOverviewCardsInOrdersPage: (value: boolean) =>
        set({ showOverviewCardsInOrdersPage: value }),
        
      setShowOverviewInHeaderOrdersPage: (value: boolean) =>
        set({ showOverviewInHeaderOrdersPage: value }),
        
      setStatusSeparatorDirection: (value: SeparatorDirection) =>
        set({ statusSeparatorDirection: value }),
        
      setPosMobileColumnsPerRow: (value: number) =>
        set({ posMobileColumnsPerRow: value }),
        
      setPosMobileCardSize: (value: POSMobileCardSize) =>
        set({ posMobileCardSize: value }),
        
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
