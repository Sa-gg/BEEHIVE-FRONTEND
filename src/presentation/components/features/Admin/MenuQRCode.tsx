import { QRCodeSVG } from 'qrcode.react'
import { Card } from '../../common/ui/card'

interface MenuQRCodeProps {
  url?: string
}

export const MenuQRCode = ({ url }: MenuQRCodeProps) => {
  // Get the current host for local network access
  const menuUrl = url || `${window.location.protocol}//${window.location.hostname}:${window.location.port}/menu`

  return (
    <Card className="p-6 text-center max-w-sm mx-auto">
      <h2 className="text-xl font-bold mb-2" style={{ color: '#F9C900' }}>
        Scan to Order
      </h2>
      <p className="text-sm text-gray-600 mb-6">
        Connect to BEEHIVE WiFi and scan this QR code to view the menu and place your order
      </p>
      
      <div className="bg-white p-6 rounded-lg inline-block shadow-sm border-2" style={{ borderColor: '#F9C900' }}>
        <QRCodeSVG
          value={menuUrl}
          size={200}
          level="H"
          includeMargin={false}
          fgColor="#000000"
        />
      </div>
      
      <div className="mt-6 text-xs text-gray-500">
        <p className="font-mono bg-gray-100 p-2 rounded">
          {menuUrl}
        </p>
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>📱 Scan with your phone camera</p>
        <p>🛜 Make sure you're connected to BEEHIVE WiFi</p>
      </div>
    </Card>
  )
}
