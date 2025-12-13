import { type ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface ClientLayoutProps {
  children: ReactNode
  hideHeader?: boolean
}

/**
 * ClientLayout - Layout for public customer-facing pages
 * 
 * Includes header with navigation and footer.
 * Used for: Home, Menu, About, etc.
 */
export const ClientLayout = ({ children, hideHeader = false }: ClientLayoutProps) => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      {!hideHeader && (
      <header 
        className="shadow-lg sticky top-0 z-50 backdrop-blur-md"
        style={{ backgroundColor: 'rgba(255, 250, 240, 0.75)' }}
      >
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <img src="/src/assets/logo.png" alt="BEEHIVE" className="h-12 w-12 object-contain" />
              <span className="text-2xl font-bold" style={{ color: '#F9C900' }}>BEEHIVE</span>
            </Link>

            {/* Navigation */}
            <div className="hidden md:flex space-x-8">
              <Link to="/" className="text-gray-700 hover:text-[#F9C900] font-medium transition-colors">Home</Link>
              <Link to="/menu" className="text-gray-700 hover:text-[#F9C900] font-medium transition-colors">Menu</Link>
              <Link to="/about" className="text-gray-700 hover:text-[#F9C900] font-medium transition-colors">About</Link>
              <Link to="/admin" className="text-[#FF9A00] hover:text-[#F9C900] font-semibold transition-colors">Admin (Dev)</Link>
            </div>

            {/* Auth Buttons */}
            <div className="flex gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-gray-700 hover:text-[#F9C900] font-medium transition-colors"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-lg font-medium transition-all hover:shadow-lg"
                style={{ backgroundColor: '#F9C900', color: '#000000' }}
              >
                Register
              </Link>
            </div>
          </div>
        </nav>
      </header>
      )}

      {/* Main Content */}
      <main className="grow">
        {children}
      </main>

      {/* Footer */}
      <footer className="py-12" style={{ backgroundColor: '#000000', color: '#FFFFFF' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand Section */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <img src="/src/assets/logo.png" alt="BEEHIVE" className="h-12 w-12 object-contain" />
                <h3 className="text-2xl font-bold" style={{ color: '#F9C900' }}>BEEHIVE</h3>
              </div>
              <p className="text-gray-400 mb-4 max-w-md">
                Enjoy your food with a relaxing ambiance, as if you are in the comfort of your own home. Good food, pool tables, and great vibes!
              </p>
              <div className="flex gap-4">
                <a href="https://www.facebook.com/BEEHIVECAFEANDRESTO" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-[#F9C900] transition-colors">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                </a>
              </div>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-semibold mb-4 text-lg" style={{ color: '#F9C900' }}>Quick Links</h4>
              <ul className="space-y-2 text-gray-400">
                <li><Link to="/" onClick={() => window.scrollTo(0, 0)} className="hover:text-[#F9C900] transition-colors">Home</Link></li>
                <li><Link to="/menu" onClick={() => window.scrollTo(0, 0)} className="hover:text-[#F9C900] transition-colors">Menu</Link></li>
                <li><Link to="/about" onClick={() => window.scrollTo(0, 0)} className="hover:text-[#F9C900] transition-colors">About</Link></li>
                <li><Link to="/register" onClick={() => window.scrollTo(0, 0)} className="hover:text-[#F9C900] transition-colors">Join Loyalty Program</Link></li>
              </ul>
            </div>
            
            {/* Contact */}
            <div>
              <h4 className="font-semibold mb-4 text-lg" style={{ color: '#F9C900' }}>Contact Us</h4>
              <ul className="space-y-3 text-gray-400">
                <li className="flex items-start gap-2">
                  <span>📍</span>
                  <span className="text-sm">Kahirup Village, Bacolod<br/>Negros Occidental</span>
                </li>
                <li className="flex items-center gap-2">
                  <span>📞</span>
                  <span className="text-sm">+63 966 641 4788</span>
                </li>
                <li className="flex items-start gap-2">
                  <span>⏰</span>
                  <span className="text-sm">Sun-Fri: 11AM-9PM<br/><span className="text-xs">(Closed Saturdays)</span></span>
                </li>
              </ul>
            </div>
          </div>
          
          {/* Bottom Bar */}
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-gray-400 text-sm">
              &copy; 2025 BEEHIVE Cafe and Resto. All rights reserved.
            </p>
            <p className="text-gray-500 text-xs">
              Crafted with 🐝 by BEEHIVE Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
