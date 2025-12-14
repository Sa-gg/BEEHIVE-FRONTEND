import { AdminLayout } from '../../components/layout/AdminLayout'
import { useSettingsStore } from '../../store/settingsStore'

export const SettingsPage = () => {
  const {
    markPaidOnConfirmOrder,
    markPaidOnPrintReceipt,
    printReceiptOnConfirmOrder,
    setMarkPaidOnConfirmOrder,
    setMarkPaidOnPrintReceipt,
    setPrintReceiptOnConfirmOrder,
  } = useSettingsStore()

  return (
    <AdminLayout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
            <p className="text-gray-600">Configure your BEEHIVE POS system preferences</p>
          </div>

          {/* Payment Settings Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
              <h2 className="text-xl font-semibold text-gray-900">Payment Settings</h2>
              <p className="text-sm text-gray-600 mt-1">
                Control when orders are automatically marked as paid
              </p>
            </div>

            <div className="divide-y divide-gray-200">
              {/* Mark Paid on Confirm Order */}
              <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Mark Paid When Confirming Order
                  </h3>
                  <p className="text-sm text-gray-600">
                    Automatically mark orders as paid when they are confirmed in the POS system
                  </p>
                </div>
                <button
                  onClick={() => setMarkPaidOnConfirmOrder(!markPaidOnConfirmOrder)}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F9C900] focus:ring-offset-2 ${
                    markPaidOnConfirmOrder ? 'bg-[#F9C900]' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={markPaidOnConfirmOrder}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      markPaidOnConfirmOrder ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Mark Paid on Print Receipt */}
              <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Mark Paid When Printing Receipt
                  </h3>
                  <p className="text-sm text-gray-600">
                    Automatically mark orders as paid when printing receipts from the Orders page
                  </p>
                </div>
                <button
                  onClick={() => setMarkPaidOnPrintReceipt(!markPaidOnPrintReceipt)}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F9C900] focus:ring-offset-2 ${
                    markPaidOnPrintReceipt ? 'bg-[#F9C900]' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={markPaidOnPrintReceipt}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      markPaidOnPrintReceipt ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              {/* Print Receipt on Confirm Order */}
              <div className="px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="flex-1 pr-4">
                  <h3 className="text-base font-medium text-gray-900 mb-1">
                    Print Receipt When Confirming Order
                  </h3>
                  <p className="text-sm text-gray-600">
                    Automatically print receipt after confirming orders in POS (does not mark as paid)
                  </p>
                </div>
                <button
                  onClick={() => setPrintReceiptOnConfirmOrder(!printReceiptOnConfirmOrder)}
                  className={`relative inline-flex h-7 w-12 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#F9C900] focus:ring-offset-2 ${
                    printReceiptOnConfirmOrder ? 'bg-[#F9C900]' : 'bg-gray-200'
                  }`}
                  role="switch"
                  aria-checked={printReceiptOnConfirmOrder}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      printReceiptOnConfirmOrder ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Info Box */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-blue-800">About Payment Settings</h3>
                <div className="mt-2 text-sm text-blue-700">
                  <p>
                    These settings control the automatic payment status updates:
                  </p>
                  <ul className="list-disc ml-5 mt-2 space-y-1">
                    <li><strong>Mark Paid on Confirm:</strong> When enabled, orders are marked as paid immediately upon confirmation in POS</li>
                    <li><strong>Mark Paid on Print Receipt:</strong> When enabled, orders are marked as paid when printing receipts from the Orders page</li>
                    <li><strong>Print Receipt on Confirm:</strong> When enabled, receipts are automatically printed after confirming orders in POS (independent of payment status)</li>
                  </ul>
                  <p className="mt-2">
                    You can still manually change payment status in the Orders page if needed.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}
