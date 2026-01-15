import { useEffect } from 'react'
import { RouterProvider } from 'react-router-dom'
import { router } from './routes'
import { useAuthStore } from './store/authStore'
import { useSettingsStore } from './store/settingsStore'
import { settingsApi } from '../infrastructure/api/settings.api'
import { ToastContainer } from './components/common/ToastNotification'

function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth)
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated)
  const {
    setAutoOutOfStockWhenIngredientsRunOut,
    setAutoMarkInStockWhenAvailable,
    setCashChangeEnabled,
    setPrintKitchenCopy,
    setPrintKitchenCopyForOpenTab,
    setLinkedOrdersEnabled,
    setAllowVoidOrderItem,
    setCashierCanVoidWithoutPin,
    setCashierCanRefundWithoutPin,
    setCashierCanComplimentaryWithoutPin,
    setCashierCanWriteOffWithoutPin,
    setCashierCanVoidAndReorderWithoutPin,
    setCashierCanApplyServiceAmount,
    setCashierCanApplyDiscount,
    setCashierCanApplyDeliveryAmount,
  } = useSettingsStore()

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  // Sync global settings from backend when user is authenticated
  useEffect(() => {
    const syncGlobalSettings = async () => {
      if (!isAuthenticated) return
      
      try {
        const { settings } = await settingsApi.getGlobalSettings()
        
        // Apply all global settings from backend
        setAutoOutOfStockWhenIngredientsRunOut(settings.autoOutOfStockWhenIngredientsRunOut)
        setAutoMarkInStockWhenAvailable(settings.autoMarkInStockWhenAvailable)
        setCashChangeEnabled(settings.cashChangeEnabled)
        setPrintKitchenCopy(settings.printKitchenCopy)
        setPrintKitchenCopyForOpenTab(settings.printKitchenCopyForOpenTab)
        setLinkedOrdersEnabled(settings.linkedOrdersEnabled)
        setAllowVoidOrderItem(settings.allowVoidOrderItem)
        setCashierCanVoidWithoutPin(settings.cashierCanVoidWithoutPin)
        setCashierCanRefundWithoutPin(settings.cashierCanRefundWithoutPin)
        setCashierCanComplimentaryWithoutPin(settings.cashierCanComplimentaryWithoutPin)
        setCashierCanWriteOffWithoutPin(settings.cashierCanWriteOffWithoutPin)
        setCashierCanVoidAndReorderWithoutPin(settings.cashierCanVoidAndReorderWithoutPin)
        setCashierCanApplyServiceAmount(settings.cashierCanApplyServiceAmount)
        setCashierCanApplyDiscount(settings.cashierCanApplyDiscount)
        setCashierCanApplyDeliveryAmount(settings.cashierCanApplyDeliveryAmount)
      } catch (error) {
        console.error('Failed to sync global settings:', error)
      }
    }
    
    syncGlobalSettings()
  }, [isAuthenticated])

  return (
    <>
      <RouterProvider router={router} />
      <ToastContainer />
    </>
  )
}

export default App
