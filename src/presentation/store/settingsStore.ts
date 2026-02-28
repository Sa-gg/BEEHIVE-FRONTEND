import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SeparatorDirection = 'off' | 'horizontal' | 'vertical'
export type POSMobileCardSize = 'small' | 'medium' | 'large'
export type NavbarIconStyle = 'outline' | 'solid'
export type NavbarBackgroundStyle = 'light' | 'dark'

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
  autoMarkInStockWhenAvailable: boolean // Auto mark products as in-stock when stock >= 1
  showCurrentStockInPOS: boolean
  
  // UI settings - Orders Page
  showHeaderInOrdersPage: boolean
  showOverviewCardsInOrdersPage: boolean
  showOverviewInHeaderOrdersPage: boolean // Show overview counts in header
  statusSeparatorDirection: SeparatorDirection // off, horizontal, or vertical (3 columns)
  
  // UI settings - POS Page Mobile
  posMobileColumnsPerRow: number // 1, 2, 3, or 4 columns per row in mobile view
  posMobileCardSize: POSMobileCardSize // small, medium, or large card size
  
  // UI settings - Navbar
  navbarIconStyle: NavbarIconStyle // outline (lucide) or solid (react-icons)
  navbarBackgroundStyle: NavbarBackgroundStyle // light or dark navbar background
  
  // Cashier permissions - whether actions require manager PIN
  cashierCanVoidWithoutPin: boolean
  cashierCanRefundWithoutPin: boolean
  cashierCanComplimentaryWithoutPin: boolean
  cashierCanWriteOffWithoutPin: boolean
  cashierCanVoidAndReorderWithoutPin: boolean
  
  // Cashier POS permissions - whether cashier can apply these amounts
  cashierCanApplyServiceAmount: boolean
  cashierCanApplyDiscount: boolean
  cashierCanApplyDeliveryAmount: boolean
  
  // Experimental features
  linkedOrdersEnabled: boolean // Enable/disable linked orders feature (experimental)
  loyaltySystemEnabled: boolean // Enable/disable loyalty system feature (experimental)
  
  // Order item permissions
  allowVoidOrderItem: boolean // Allow voiding individual order items (vs entire order)
  
  // Actions
  setMarkPaidOnPrintReceipt: (value: boolean) => void
  setCashChangeEnabled: (value: boolean) => void
  setPrintKitchenCopy: (value: boolean) => void
  setPrintKitchenCopyForOpenTab: (value: boolean) => void
  setAutoPrintOnReceiptButton: (value: boolean) => void
  setToastDurationSeconds: (value: number) => void
  setMaxToastNotifications: (value: number) => void
  setAutoOutOfStockWhenIngredientsRunOut: (value: boolean) => void
  setAutoMarkInStockWhenAvailable: (value: boolean) => void
  setShowCurrentStockInPOS: (value: boolean) => void
  setShowHeaderInOrdersPage: (value: boolean) => void
  setShowOverviewCardsInOrdersPage: (value: boolean) => void
  setShowOverviewInHeaderOrdersPage: (value: boolean) => void
  setStatusSeparatorDirection: (value: SeparatorDirection) => void
  setPosMobileColumnsPerRow: (value: number) => void
  setPosMobileCardSize: (value: POSMobileCardSize) => void
  setNavbarIconStyle: (value: NavbarIconStyle) => void
  setNavbarBackgroundStyle: (value: NavbarBackgroundStyle) => void
  setCashierCanVoidWithoutPin: (value: boolean) => void
  setCashierCanRefundWithoutPin: (value: boolean) => void
  setCashierCanComplimentaryWithoutPin: (value: boolean) => void
  setCashierCanWriteOffWithoutPin: (value: boolean) => void
  setCashierCanVoidAndReorderWithoutPin: (value: boolean) => void
  
  // Cashier POS permissions setters
  setCashierCanApplyServiceAmount: (value: boolean) => void
  setCashierCanApplyDiscount: (value: boolean) => void
  setCashierCanApplyDeliveryAmount: (value: boolean) => void
  
  // Experimental features setters
  setLinkedOrdersEnabled: (value: boolean) => void
  setLoyaltySystemEnabled: (value: boolean) => void
  
  // Order item permissions setters
  setAllowVoidOrderItem: (value: boolean) => void
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
      autoMarkInStockWhenAvailable: false, // Default OFF - don't auto mark in stock
      showCurrentStockInPOS: true, // Default ON - show stock in POS
      
      // Default settings - UI Orders Page
      showHeaderInOrdersPage: true, // Default ON - show header
      showOverviewCardsInOrdersPage: true, // Default ON - show overview cards
      showOverviewInHeaderOrdersPage: false, // Default OFF - don't show overview in header
      statusSeparatorDirection: 'off', // Default OFF - use standard view without separators
      
      // Default settings - UI POS Page Mobile
      posMobileColumnsPerRow: 2, // Default 2 columns per row
      posMobileCardSize: 'medium' as POSMobileCardSize, // Default medium size
      
      // Default settings - UI Navbar
      navbarIconStyle: 'outline' as NavbarIconStyle, // Default outline (lucide icons)
      navbarBackgroundStyle: 'dark' as NavbarBackgroundStyle, // Default dark navbar
      
      // Default settings - Cashier permissions (all require PIN by default)
      cashierCanVoidWithoutPin: false,
      cashierCanRefundWithoutPin: false,
      cashierCanComplimentaryWithoutPin: false,
      cashierCanWriteOffWithoutPin: false,
      cashierCanVoidAndReorderWithoutPin: false,
      
      // Default settings - Cashier POS permissions (all disabled by default - require manager PIN)
      cashierCanApplyServiceAmount: false,
      cashierCanApplyDiscount: false,
      cashierCanApplyDeliveryAmount: false,
      
      // Default settings - Experimental features
      linkedOrdersEnabled: false, // Default OFF - linked orders is experimental
      loyaltySystemEnabled: false, // Default OFF - loyalty system is experimental
      
      // Default settings - Order item permissions
      allowVoidOrderItem: true, // Default ON - allow voiding individual items
      
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
        
      setAutoMarkInStockWhenAvailable: (value: boolean) =>
        set({ autoMarkInStockWhenAvailable: value }),
        
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
        
      setNavbarIconStyle: (value: NavbarIconStyle) =>
        set({ navbarIconStyle: value }),
        
      setNavbarBackgroundStyle: (value: NavbarBackgroundStyle) =>
        set({ navbarBackgroundStyle: value }),
        
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
        
      setCashierCanApplyServiceAmount: (value: boolean) =>
        set({ cashierCanApplyServiceAmount: value }),
        
      setCashierCanApplyDiscount: (value: boolean) =>
        set({ cashierCanApplyDiscount: value }),
        
      setCashierCanApplyDeliveryAmount: (value: boolean) =>
        set({ cashierCanApplyDeliveryAmount: value }),
        
      setLinkedOrdersEnabled: (value: boolean) =>
        set({ linkedOrdersEnabled: value }),
        
      setLoyaltySystemEnabled: (value: boolean) =>
        set({ loyaltySystemEnabled: value }),
        
      setAllowVoidOrderItem: (value: boolean) =>
        set({ allowVoidOrderItem: value }),
    }),
    {
      name: 'beehive-settings',
    }
  )
)
