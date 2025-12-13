import { AdminLayout } from '../../components/layout/AdminLayout'
import { MenuQRCode } from '../../components/features/Admin/MenuQRCode'

export const DashboardPage = () => {
  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {[
            { label: 'Total Sales', value: '$12,345', change: '+12.5%', accent: '#F9C900' },
            { label: 'Orders Today', value: '86', change: '+8.2%', accent: '#FF9A00' },
            { label: 'Active Customers', value: '1,234', change: '+3.1%', accent: '#F9C900' },
            { label: 'Pending Orders', value: '12', change: 'Action needed', accent: '#FF9A00' },
          ].map((stat, index) => (
            <div key={index} className="bg-white rounded-lg shadow p-6 border-l-4" style={{ borderLeftColor: stat.accent }}>
              <p className="text-sm text-gray-600">{stat.label}</p>
              <p className="text-3xl font-bold mt-2" style={{ color: '#000000' }}>{stat.value}</p>
              <p className="text-sm mt-1" style={{ color: index === 3 ? '#FF9A00' : '#4CAF50' }}>{stat.change}</p>
            </div>
          ))}
        </div>

        {/* Customer Menu QR Code */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold mb-4">Customer Menu QR Code</h2>
          <p className="text-gray-600 mb-6">
            Display this QR code so customers can scan and order from their phones
          </p>
          <MenuQRCode />
        </div>
      </div>
    </AdminLayout>
  )
}
