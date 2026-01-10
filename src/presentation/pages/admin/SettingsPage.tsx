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
  Key,
  LayoutDashboard,
  Smartphone
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
    markPaidOnPrintReceipt,
    printKitchenCopy,
    printKitchenCopyForOpenTab,
    cashChangeEnabled,
    toastDurationSeconds,
    maxToastNotifications,
    autoOutOfStockWhenIngredientsRunOut,
    showCurrentStockInPOS,
    showHeaderInOrdersPage,
    showOverviewCardsInOrdersPage,
    showOverviewInHeaderOrdersPage,
    statusSeparatorDirection,
    posMobileColumnsPerRow,
    posMobileCardSize,
    cashierCanVoidWithoutPin,
    cashierCanRefundWithoutPin,
    cashierCanComplimentaryWithoutPin,
    cashierCanWriteOffWithoutPin,
    cashierCanVoidAndReorderWithoutPin,
    setMarkPaidOnPrintReceipt,
    setPrintKitchenCopy,
    setPrintKitchenCopyForOpenTab,
    setCashChangeEnabled,
    setToastDurationSeconds,
    setMaxToastNotifications,
    setAutoOutOfStockWhenIngredientsRunOut,
    setShowCurrentStockInPOS,
    setShowHeaderInOrdersPage,
    setShowOverviewCardsInOrdersPage,
    setShowOverviewInHeaderOrdersPage,
    setStatusSeparatorDirection,
    setPosMobileColumnsPerRow,
    setPosMobileCardSize,
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
              description="Control payment behavior in the POS system"
              color="green"
            />
            <div className="divide-y divide-gray-100">
              <SettingItem
                title="Cash & Change Calculator"
                description="Show calculator modal to enter cash received and calculate change when marking CASH orders as paid"
                enabled={cashChangeEnabled}
                onChange={() => setCashChangeEnabled(!cashChangeEnabled)}
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
                title="Print Kitchen Copy (2 Receipts)"
                description="Print an extra receipt for the kitchen when using the print button"
                enabled={printKitchenCopy}
                onChange={() => setPrintKitchenCopy(!printKitchenCopy)}
              />
              <SettingItem
                title="Print Kitchen Copy for Open Tab"
                description="Print a kitchen receipt when clicking Open Tab button in POS"
                enabled={printKitchenCopyForOpenTab}
                onChange={() => setPrintKitchenCopyForOpenTab(!printKitchenCopyForOpenTab)}
              />
            </div>
          </div>

          {/* Toast Notification Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader 
              icon={Info} 
              title="Toast Notifications" 
              description="Configure notification display in POS"
              color="amber"
            />
            <div className="divide-y divide-gray-100">
              {/* Toast Duration */}
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-gray-900">Toast Duration (seconds)</h3>
                  <p className="text-xs text-gray-500 mt-0.5">How long toast notifications stay visible</p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={toastDurationSeconds}
                  onChange={(e) => setToastDurationSeconds(Math.max(1, Math.min(30, parseInt(e.target.value) || 5)))}
                  className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white text-center"
                />
              </div>

              {/* Max Toast Notifications */}
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-gray-900">Max Visible Toasts</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Maximum number of toast notifications shown at once</p>
                </div>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={maxToastNotifications}
                  onChange={(e) => setMaxToastNotifications(Math.max(1, Math.min(10, parseInt(e.target.value) || 3)))}
                  className="w-20 px-3 py-1.5 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 bg-white text-center"
                />
              </div>
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

          {/* UI Display Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader 
              icon={LayoutDashboard} 
              title="Orders Page Display" 
              description="Configure the Orders page layout and appearance"
              color="blue"
            />
            <div className="divide-y divide-gray-100">
              <SettingItem
                title="Show Header"
                description="Display the page header with title and notification bell (like POS page hides the header)"
                enabled={showHeaderInOrdersPage}
                onChange={() => setShowHeaderInOrdersPage(!showHeaderInOrdersPage)}
              />
              <SettingItem
                title="Show Overview Cards"
                description="Display the status summary cards (Pending, Preparing, Completed) at the top of the Orders page"
                enabled={showOverviewCardsInOrdersPage}
                onChange={() => setShowOverviewCardsInOrdersPage(!showOverviewCardsInOrdersPage)}
              />
              <SettingItem
                title="Show Overview in Header"
                description="Display pending/preparing/completed counts in the page header (requires header to be visible)"
                enabled={showOverviewInHeaderOrdersPage}
                onChange={() => setShowOverviewInHeaderOrdersPage(!showOverviewInHeaderOrdersPage)}
                disabled={!showHeaderInOrdersPage}
              />
              
              {/* Separator Direction Selection */}
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-gray-900">Status Separator Layout</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Choose how orders are separated by status</p>
                </div>
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                  <button
                    onClick={() => setStatusSeparatorDirection('off')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      statusSeparatorDirection === 'off' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Off
                  </button>
                  <button
                    onClick={() => setStatusSeparatorDirection('horizontal')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      statusSeparatorDirection === 'horizontal' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Horizontal
                  </button>
                  <button
                    onClick={() => setStatusSeparatorDirection('vertical')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      statusSeparatorDirection === 'vertical' 
                        ? 'bg-amber-100 text-amber-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Vertical
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* POS Mobile Settings */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
            <SectionHeader 
              icon={Smartphone} 
              title="POS Page Mobile View" 
              description="Configure how the POS page appears on mobile devices"
              color="purple"
            />
            <div className="divide-y divide-gray-100">
              {/* Columns Per Row Selection */}
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-gray-900">Columns Per Row</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Number of menu item cards per row on mobile</p>
                </div>
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                  {[1, 2, 3, 4].map((cols) => (
                    <button
                      key={cols}
                      onClick={() => setPosMobileColumnsPerRow(cols)}
                      className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                        posMobileColumnsPerRow === cols 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'text-gray-500 hover:text-gray-700'
                      }`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>
              
              {/* Card Size Selection */}
              <div className="px-6 py-4 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-sm font-medium text-gray-900">Card Size</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Size of menu item cards on mobile view</p>
                </div>
                <div className="flex items-center gap-1 border border-gray-200 rounded-lg p-1 bg-gray-50">
                  <button
                    onClick={() => setPosMobileCardSize('small')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      posMobileCardSize === 'small' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Small
                  </button>
                  <button
                    onClick={() => setPosMobileCardSize('medium')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      posMobileCardSize === 'medium' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Medium
                  </button>
                  <button
                    onClick={() => setPosMobileCardSize('large')}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      posMobileCardSize === 'large' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    Large
                  </button>
                </div>
              </div>
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
