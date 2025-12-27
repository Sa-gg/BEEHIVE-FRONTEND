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
  AlertTriangle
} from 'lucide-react'

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
  const {
    markPaidOnConfirmOrder,
    markPaidOnPrintReceipt,
    printReceiptOnConfirmOrder,
    printKitchenCopy,
    autoOutOfStockWhenIngredientsRunOut,
    showCurrentStockInPOS,
    setMarkPaidOnConfirmOrder,
    setMarkPaidOnPrintReceipt,
    setPrintReceiptOnConfirmOrder,
    setPrintKitchenCopy,
    setAutoOutOfStockWhenIngredientsRunOut,
    setShowCurrentStockInPOS,
  } = useSettingsStore()

  const [isSyncing, setIsSyncing] = useState(false)
  const [openTime, setOpenTime] = useState('08:00')
  const [closeTime, setCloseTime] = useState('22:00')

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

  return (
    <AdminLayout>
      <div className="p-4 lg:p-8 bg-gray-50/50 min-h-screen">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2.5 bg-amber-100 rounded-xl">
                <SettingsIcon className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Settings</h1>
                <p className="text-gray-500">Configure your BEEHIVE POS system preferences</p>
              </div>
            </div>
          </div>

          <div className="space-y-6">
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
                <SettingItem
                  title="Mark Paid When Printing Receipt"
                  description="Automatically mark orders as paid when printing receipts from the Orders page"
                  enabled={markPaidOnPrintReceipt}
                  onChange={() => setMarkPaidOnPrintReceipt(!markPaidOnPrintReceipt)}
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
                  description="Automatically print receipt after confirming orders in POS (does not mark as paid)"
                  enabled={printReceiptOnConfirmOrder}
                  onChange={() => setPrintReceiptOnConfirmOrder(!printReceiptOnConfirmOrder)}
                />
                <SettingItem
                  title="Print Kitchen Copy (2 Receipts)"
                  description="Print an extra receipt for the kitchen when using the print button. Helps speed up kitchen workflow."
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
                  description="Automatically mark menu items as out of stock when their ingredients are depleted. If OFF, items show as 0 stock but remain orderable."
                  enabled={autoOutOfStockWhenIngredientsRunOut}
                  onChange={() => setAutoOutOfStockWhenIngredientsRunOut(!autoOutOfStockWhenIngredientsRunOut)}
                  warning={autoOutOfStockWhenIngredientsRunOut}
                />
                <SettingItem
                  title="Show Current Stock in POS"
                  description="Display the available stock count on menu items in the POS page. Helps cashiers see inventory levels at a glance."
                  enabled={showCurrentStockInPOS}
                  onChange={() => setShowCurrentStockInPOS(!showCurrentStockInPOS)}
                />
              </div>

              {/* Inventory Info Box */}
              <div className="px-6 py-4 bg-amber-50/50 border-t border-amber-100">
                <div className="flex gap-3">
                  <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-amber-800">
                    <p className="font-medium mb-1">About Smart Inventory</p>
                    <ul className="list-disc ml-4 space-y-1 text-amber-700">
                      <li>The system tracks ingredient usage but may not be 100% accurate due to real-world factors</li>
                      <li>When "Auto Out-of-Stock" is OFF, cashiers can still take orders even when stock shows 0</li>
                      <li>Stock transactions will note when orders are processed despite low ingredients</li>
                      <li>Use the Products page to manually mark items as out of stock when needed</li>
                    </ul>
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
                <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 pr-4">
                    <h3 className="text-base font-medium text-gray-900">Opening Time</h3>
                    <p className="text-sm text-gray-500 mt-1">The time your store opens for business each day</p>
                  </div>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => handleTimeChange('openTime', e.target.value)}
                    disabled={isSyncing}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  />
                </div>

                {/* Close Time */}
                <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                  <div className="flex-1 pr-4">
                    <h3 className="text-base font-medium text-gray-900">Closing Time</h3>
                    <p className="text-sm text-gray-500 mt-1">The time your store closes for business each day</p>
                  </div>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => handleTimeChange('closeTime', e.target.value)}
                    disabled={isSyncing}
                    className="px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-400 focus:border-amber-400 disabled:opacity-50 disabled:cursor-not-allowed bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5">
              <div className="flex gap-3">
                <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <h3 className="font-semibold mb-2">Quick Reference</h3>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Payment Settings</p>
                      <ul className="list-disc ml-4 space-y-0.5 text-blue-700">
                        <li>Mark Paid on Confirm: Orders paid immediately on confirmation</li>
                        <li>Mark Paid on Print: Orders paid when receipt is printed</li>
                      </ul>
                    </div>
                    <div>
                      <p className="font-medium text-blue-900 mb-1">Inventory Settings</p>
                      <ul className="list-disc ml-4 space-y-0.5 text-blue-700">
                        <li>Auto Out-of-Stock: Control automatic menu availability</li>
                        <li>Show Stock in POS: Toggle stock display for cashiers</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
