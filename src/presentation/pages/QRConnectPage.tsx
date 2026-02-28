import { useEffect, useRef } from 'react'
import QRCode from 'qrcode'

export const QRConnectPage = () => {
  const qrMenuRef = useRef<HTMLCanvasElement>(null)
  const qrHomeRef = useRef<HTMLCanvasElement>(null)
  const qrAdminRef = useRef<HTMLCanvasElement>(null)

  // Get base URL from VITE_API_URL environment variable
  // VITE_API_URL=http://192.168.1.10:3000 → http://192.168.1.10:5173
  const getBaseUrl = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    try {
      const url = new URL(apiUrl)
      // Replace API port (3000) with Vite dev server port (5173)
      return `${url.protocol}//${url.hostname}:5173`
    } catch {
      return 'http://localhost:5173'
    }
  }

  const baseUrl = getBaseUrl()
  
  const urls = {
    menu: `${baseUrl}/menu`,
    home: `${baseUrl}/`,
    admin: `${baseUrl}/admin`
  }

  // Extract hostname from API URL for display
  const getHostInfo = () => {
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
    try {
      const url = new URL(apiUrl)
      return {
        hostname: url.hostname,
        apiPort: url.port || '3000',
        frontendPort: '5173'
      }
    } catch {
      return { hostname: 'localhost', apiPort: '3000', frontendPort: '5173' }
    }
  }

  const hostInfo = getHostInfo()

  useEffect(() => {
    const generateQR = async (canvas: HTMLCanvasElement | null, url: string) => {
      if (!canvas) return
      try {
        await QRCode.toCanvas(canvas, url, {
          width: 200,
          margin: 2,
          color: {
            dark: '#000000',
            light: '#ffffff'
          }
        })
      } catch (err) {
        console.error('QR generation error:', err)
      }
    }

    generateQR(qrMenuRef.current, urls.menu)
    generateQR(qrHomeRef.current, urls.home)
    generateQR(qrAdminRef.current, urls.admin)
  }, [urls.menu, urls.home, urls.admin])

  const copyUrl = async (url: string, buttonId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      const btn = document.getElementById(buttonId)
      if (btn) {
        const original = btn.textContent
        btn.textContent = '✅ Copied!'
        setTimeout(() => {
          btn.textContent = original
        }, 2000)
      }
    } catch (err) {
      console.error('Copy failed:', err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-amber-100 flex items-center justify-center p-4">
      {/* Floating bees */}
      <div className="fixed top-[10%] left-[10%] text-2xl opacity-30 animate-bounce">🐝</div>
      <div className="fixed top-[20%] right-[15%] text-2xl opacity-30 animate-bounce" style={{ animationDelay: '1s' }}>🐝</div>
      <div className="fixed bottom-[15%] left-[20%] text-2xl opacity-30 animate-bounce" style={{ animationDelay: '2s' }}>🐝</div>

      <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-lg w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="text-5xl mb-2">🍯</div>
          <h1 className="text-3xl font-bold text-gray-800">BEEHIVE</h1>
          <p className="text-gray-500 text-sm">Scan QR code to connect on your phone</p>
        </div>

        {/* QR Codes Grid */}
        <div className="space-y-6">
          {/* Menu QR */}
          <div className="text-center p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-2xl border-2 border-yellow-400">
            <div className="font-semibold text-gray-700 mb-3 flex items-center justify-center gap-2">
              📱 Customer Menu
            </div>
            <div className="inline-block bg-white p-4 rounded-xl border-2 border-yellow-300 mb-3">
              <canvas ref={qrMenuRef}></canvas>
            </div>
            <div className="bg-gray-100 px-4 py-2 rounded-lg font-mono text-xs text-gray-700 break-all">
              {urls.menu}
            </div>
            <button
              id="copy-menu"
              onClick={() => copyUrl(urls.menu, 'copy-menu')}
              className="mt-2 px-4 py-2 bg-yellow-400 hover:bg-yellow-500 rounded-lg font-semibold text-sm transition-all"
            >
              📋 Copy URL
            </button>
          </div>

          {/* Home & Admin Row */}
          <div className="grid grid-cols-2 gap-4">
            {/* Home QR */}
            <div className="text-center p-3 bg-gray-50 rounded-xl border">
              <div className="font-semibold text-gray-600 text-sm mb-2">🏠 Home</div>
              <div className="inline-block bg-white p-2 rounded-lg border mb-2">
                <canvas ref={qrHomeRef} className="w-[120px] h-[120px]"></canvas>
              </div>
              <div className="text-[10px] text-gray-500 break-all mb-1">{urls.home}</div>
              <button
                id="copy-home"
                onClick={() => copyUrl(urls.home, 'copy-home')}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium transition-all"
              >
                📋 Copy
              </button>
            </div>

            {/* Admin QR */}
            <div className="text-center p-3 bg-gray-50 rounded-xl border">
              <div className="font-semibold text-gray-600 text-sm mb-2">⚙️ Admin</div>
              <div className="inline-block bg-white p-2 rounded-lg border mb-2">
                <canvas ref={qrAdminRef} className="w-[120px] h-[120px]"></canvas>
              </div>
              <div className="text-[10px] text-gray-500 break-all mb-1">{urls.admin}</div>
              <button
                id="copy-admin"
                onClick={() => copyUrl(urls.admin, 'copy-admin')}
                className="px-3 py-1 bg-gray-200 hover:bg-gray-300 rounded text-xs font-medium transition-all"
              >
                📋 Copy
              </button>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-6 p-4 bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl">
          <h3 className="font-semibold text-gray-700 text-sm mb-2 flex items-center gap-2">
            📝 How to Connect
          </h3>
          <ol className="text-xs text-gray-600 space-y-1 list-decimal list-inside">
            <li>Make sure your phone is on the <strong>same WiFi network</strong></li>
            <li>Open your phone's camera app</li>
            <li>Point at the QR code above</li>
            <li>Tap the link that appears</li>
          </ol>
        </div>

        {/* Network Info */}
        <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
          <h4 className="text-blue-700 text-xs font-semibold uppercase tracking-wide mb-2">
            🌐 Network Configuration
          </h4>
          <div className="text-xs text-gray-700 space-y-1">
            <div><strong>IP Address:</strong> {hostInfo.hostname}</div>
            <div><strong>Frontend Port:</strong> {hostInfo.frontendPort}</div>
            <div><strong>API Port:</strong> {hostInfo.apiPort}</div>
            <div><strong>Base URL:</strong> {baseUrl}</div>
          </div>
        </div>

        {/* Warning */}
        <div className="mt-4 p-3 bg-amber-50 rounded-lg border border-amber-300">
          <p className="text-xs text-amber-800">
            <strong>⚠️ Not Working?</strong> Make sure both devices are on the same WiFi. 
            If using a VPN, try disabling it.
          </p>
        </div>

        {/* Footer */}
        <p className="text-center text-gray-400 text-xs mt-4">
          BEEHIVE POS System • For Testing Purposes
        </p>
      </div>
    </div>
  )
}
