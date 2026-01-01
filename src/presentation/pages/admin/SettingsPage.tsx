import { AdminLayout } from '../../components/layout/AdminLayout'
import { useSettingsStore } from '../../store/settingsStore'
import { settingsApi } from '../../../infrastructure/api/settings.api'
import type { Settings } from '../../../infrastructure/api/settings.api'
import { useEffect, useState } from 'react'
import { 
  CreditCard, 
  Printer, 
  Clock, 
  Package, 
  Settings as SettingsIcon,
  Info,
  AlertTriangle,
  Shield,
  Key
} from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

// Toggle Switch Component
const ToggleSwitch = ({ 
  enabled, 
  onChange, 
  disabled = false 
}: { 
  enabled: boolean
  onChange: () => void
  disabled?: boolean 
}) => (
  <button
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
      enabled ? 'bg-amber-500' : 'bg-gray-200'
    }`}
    role="switch"
    aria-checked={enabled}
  >
    <span
      className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        enabled ? 'translate-x-5' : 'translate-x-0'
      }`}
    />
  </button>
)

// Setting Item Component
const SettingItem = ({
  title,
  description,
  enabled,
  onChange,
  disabled = false,
  warning = false
}: {
  title: string
  description: string
  enabled: boolean
  onChange: () => void
  disabled?: boolean
  warning?: boolean
}) => (
  <div className={`px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors ${warning ? 'bg-amber-50/50' : ''}`}>
    <div className="flex-1 pr-4">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-medium text-gray-900">{title}</h3>
        {warning && <AlertTriangle className="h-4 w-4 text-amber-500" />}
      </div>
      <p className="text-sm text-gray-500 mt-1">{description}</p>
    </div>
    <ToggleSwitch enabled={enabled} onChange={onChange} disabled={disabled} />
  </div>
)

// Section Header Component
const SectionHeader = ({ 
  icon: Icon, 
  title, 
  description,
  color = 'amber'
}: { 
  icon: React.ElementType
  title: string
  description: string
  color?: 'amber' | 'blue' | 'green' | 'purple'
}) => {
  const colorClasses = {
    amber: 'bg-amber-50 text-amber-600',
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600'
  }
  
  return (
    <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/80">
      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
          <p className="text-sm text-gray-500">{description}</p>
        </div>
      </div>
    </div>
  )
}

export const SettingsPage = () => {
  const { user } = useAuthStore()
  const isManager = user?.role === 'MANAGER' || user?.role === 'ADMIN'
  
  const {
    markPaidOnConfirmOrder,
    markPaidOnPrintReceipt,
    printReceiptOnConfirmOrder,
    printKitchenCopy,
    autoOutOfStockWhenIngredientsRunOut,
    showCurrentStockInPOS,
    cashierCanVoidWithoutPin,
    cashierCanRefundWithoutPin,
    cashierCanComplimentaryWithoutPin,
    cashierCanWriteOffWithoutPin,
    cashierCanVoidAndReorderWithoutPin,
    setMarkPaidOnConfirmOrder,
    setMarkPaidOnPrintReceipt,
    setPrintReceiptOnConfirmOrder,
    setPrintKitchenCopy,
    setAutoOutOfStockWhenIngredientsRunOut,
    setShowCurrentStockInPOS,
    setCashierCanVoidWithoutPin,
    setCashierCanRefundWithoutPin,
    setCashierCanComplimentaryWithoutPin,
    setCashierCanWriteOffWithoutPin,
    setCashierCanVoidAndReorderWithoutPin,
  } = useSettingsStore()

  const [isSyncing, setIsSyncing] = useState(false)
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('22:00')
  
  // Manager PIN change state
  const [showPinChange, setShowPinChange] = useState(false)
  const [currentPin, setCurrentPin] = useState('')
  const [newPin, setNewPin] = useState('')
  const [confirmPin, setConfirmPin] = useState('')
  const [pinError, setPinError] = useState('')

  // Sync with backend settings on mount
  useEffect(() => {
    const syncSettings = async () => {
      try {
        const backendSettings = await settingsApi.getSettings()
        setOpenTime(backendSettings.openTime)
        setCloseTime(backendSettings.closeTime)
      } catch (error) {
        console.error('Failed to sync settings:', error)
      }
    }
    syncSettings()
  }, [])

  const handleTimeChange = async (field: 'openTime' | 'closeTime', value: string) => {
    setIsSyncing(true)
    try {
      const settings: Partial<Settings> = { [field]: value }
      const updated = await settingsApi.updateSettings(settings)
      
      if (field === 'openTime') {
        setOpenTime(updated.openTime)
      } else {
        setCloseTime(updated.closeTime)
      }
    } catch (error) {
      console.error('Failed to update time:', error)
      alert('Failed to update time. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const handlePinChange = async () => {
    setPinError('')
    
    if (currentPin.length !== 4 || !/^\d{4}$/.test(currentPin)) {
      setPinError('Current PIN must be exactly 4 digits')
      return
    }
    
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) {
      setPinError('New PIN must be exactly 4 digits')
      return
    }
    
    if (newPin !== confirmPin) {
      setPinError('New PINs do not match')
      return
    }
    
    try {
      // Update manager PIN via API
      const response = await settingsApi.updateManagerPin(currentPin, newPin)
      if (response.success) {
        alert('Manager PIN updated successfully!')
        setShowPinChange(false)
        setCurrentPin('')
        setNewPin('')
        setConfirmPin('')
      }
    } catch (error: unknown) {
      console.error('Failed to update PIN:', error)
      if (error instanceof Error && error.message.includes('401')) {
        setPinError('Current PIN is incorrect')
      } else {
        setPinError('Failed to update PIN. Please try again.')
      }
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-amber-100 rounded-xl">
            <SettingsIcon className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500">Configure your BEEHIVE POS system preferences</p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Payment Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader 
              icon={CreditCard} 
              title="Payment Settings" 
              description="Control when orders are automatically marked as paid"
              color="green"
            />
            <div className="divide-y divide-gray-100">
              <SettingItem
                title="Mark Paid When Confirming Order"
                description="Automatically mark orders as paid when they are confirmed in the POS system"
                enabled={markPaidOnConfirmOrder}
                onChange={() => setMarkPaidOnConfirmOrder(!markPaidOnConfirmOrder)}
              />
            </div>
          </div>

          {/* Printing Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader 
              icon={Printer} 
              title="Printing Settings" 
              description="Configure receipt printing behavior"
              color="blue"
            />
            <div className="divide-y divide-gray-100">
              <SettingItem
                title="Print Receipt When Confirming Order"
                description="Automatically print receipt after confirming orders in POS"
                enabled={printReceiptOnConfirmOrder}
                onChange={() => setPrintReceiptOnConfirmOrder(!printReceiptOnConfirmOrder)}
              />
              <SettingItem
                title="Print Kitchen Copy (2 Receipts)"
                description="Print an extra receipt for the kitchen when using the print button"
                enabled={printKitchenCopy}
                onChange={() => setPrintKitchenCopy(!printKitchenCopy)}
              />
            </div>
          </div>

          {/* Inventory Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader 
              icon={Package} 
              title="Smart Inventory Settings" 
              description="Configure how inventory affects menu availability"
              color="purple"
            />
            <div className="divide-y divide-gray-100">
              <SettingItem
                title="Auto Out-of-Stock When Ingredients Run Out"
                description="Automatically mark menu items as out of stock when their ingredients are depleted"
                enabled={autoOutOfStockWhenIngredientsRunOut}
                onChange={() => setAutoOutOfStockWhenIngredientsRunOut(!autoOutOfStockWhenIngredientsRunOut)}
                warning={autoOutOfStockWhenIngredientsRunOut}
              />
              <SettingItem
                title="Show Current Stock in POS"
                description="Display the available stock count on menu items in the POS page"
                enabled={showCurrentStockInPOS}
                onChange={() => setShowCurrentStockInPOS(!showCurrentStockInPOS)}
              />
            </div>
          </div>

          {/* Store Hours Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader 
              icon={Clock} 
              title="Store Operating Hours" 
              description="Configure when your store opens and closes"
              color="amber"
            />
            <div className="divide-y divide-gray-100">
              {/* Open Time */}
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-gray-900">Opening Time</h3>
                  <p className="text-xs text-gray-500 mt-0.5">The time your store opens for business</p>
                </div>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => handleTimeChange('openTime', e.target.value)}
                  disabled={isSyncing}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 bg-white"
                />
              </div>

              {/* Close Time */}
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-gray-900">Closing Time</h3>
                  <p className="text-xs text-gray-500 mt-0.5">The time your store closes for business</p>
                </div>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => handleTimeChange('closeTime', e.target.value)}
                  disabled={isSyncing}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Manager Settings - Only visible to managers/admins */}
        {isManager && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Manager PIN Settings */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <SectionHeader 
                icon={Key} 
                title="Manager PIN" 
                description="Change the manager authorization PIN"
                color="amber"
              />
              <div className="px-6 py-5">
                {!showPinChange ? (
                  <button
                    onClick={() => setShowPinChange(true)}
                    className="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg hover:bg-amber-200 transition-colors font-medium text-sm"
                  >
                    Change Manager PIN
                  </button>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Current PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={currentPin}
                        onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                        placeholder="Enter current PIN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">New PIN (4 digits)</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={newPin}
                        onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                        placeholder="Enter new 4-digit PIN"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New PIN</label>
                      <input
                        type="password"
                        maxLength={4}
                        value={confirmPin}
                        onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400"
                        placeholder="Confirm new PIN"
                      />
                    </div>
                    {pinError && (
                      <p className="text-sm text-red-600">{pinError}</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={handlePinChange}
                        className="px-4 py-2 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors font-medium text-sm"
                      >
                        Update PIN
                      </button>
                      <button
                        onClick={() => {
                          setShowPinChange(false)
                          setCurrentPin('')
                          setNewPin('')
                          setConfirmPin('')
                          setPinError('')
                        }}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Cashier Permissions */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
              <SectionHeader 
                icon={Shield} 
                title="Cashier Permissions" 
                description="Configure which actions cashiers can perform without manager PIN"
                color="purple"
              />
              <div className="divide-y divide-gray-100">
                <SettingItem
                  title="Void Order Without PIN"
                  description="Allow cashiers to void orders without manager PIN"
                  enabled={cashierCanVoidWithoutPin}
                  onChange={() => setCashierCanVoidWithoutPin(!cashierCanVoidWithoutPin)}
                  warning={cashierCanVoidWithoutPin}
                />
                <SettingItem
                  title="Refund Order Without PIN"
                  description="Allow cashiers to process refunds without manager PIN"
                  enabled={cashierCanRefundWithoutPin}
                  onChange={() => setCashierCanRefundWithoutPin(!cashierCanRefundWithoutPin)}
                  warning={cashierCanRefundWithoutPin}
                />
                <SettingItem
                  title="Mark Complimentary Without PIN"
                  description="Allow cashiers to mark orders as complimentary without PIN"
                  enabled={cashierCanComplimentaryWithoutPin}
                  onChange={() => setCashierCanComplimentaryWithoutPin(!cashierCanComplimentaryWithoutPin)}
                  warning={cashierCanComplimentaryWithoutPin}
                />
                <SettingItem
                  title="Write-Off Order Without PIN"
                  description="Allow cashiers to write off unpaid orders without PIN"
                  enabled={cashierCanWriteOffWithoutPin}
                  onChange={() => setCashierCanWriteOffWithoutPin(!cashierCanWriteOffWithoutPin)}
                  warning={cashierCanWriteOffWithoutPin}
                />
                <SettingItem
                  title="Void & Re-order Without PIN"
                  description="Allow cashiers to void orders and create re-orders without PIN"
                  enabled={cashierCanVoidAndReorderWithoutPin}
                  onChange={() => setCashierCanVoidAndReorderWithoutPin(!cashierCanVoidAndReorderWithoutPin)}
                  warning={cashierCanVoidAndReorderWithoutPin}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}
