import { ClientLayout } from '../../components/layout/ClientLayout'
import { Button } from '../../components/common/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '../../components/common/ui/card'
import { Link, useNavigate } from 'react-router-dom'
import { useState, useEffect, useCallback } from 'react'
import { MOOD_OPTIONS, type MoodType } from '../../../shared/utils/moodSystem'
import { Sparkles, Bell } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'
import { ordersApi } from '../../../infrastructure/api/orders.api'
import { moodSettingsApi } from '../../../infrastructure/api/moodSettings.api'
import { MyOrdersModal } from '../../components/features/CustomerMenu/MyOrdersModal'
import { useOrderEvents } from '../../../shared/hooks/useOrderEvents'
import { getDeviceId } from '../../../shared/utils/deviceId'
import { playSuccessSound, vibrate } from '../../../shared/utils/notificationSound'

export const HomePage = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)
  const [showMyOrders, setShowMyOrders] = useState(false)
  const [orderNotifications, setOrderNotifications] = useState(0)
  const [hasOrderUpdates, setHasOrderUpdates] = useState(false)
  
  // Get device ID for guest tracking
  const deviceId = getDeviceId()

  // Function to refresh order notifications
  const refreshOrderNotifications = useCallback(async () => {
    try {
      let customerOrders
      
      if (user) {
        const allOrders = await ordersApi.getAll()
        customerOrders = allOrders.filter(
          order => order.customerName === user?.name || order.customerName === user?.email
        )
      } else {
        customerOrders = await ordersApi.getMyOrders()
      }
      
      const feedbackConfig = await moodSettingsApi.getFeedbackConfig().catch(() => null)
      
      const activeCount = customerOrders.filter(
        o => !['COMPLETED', 'CANCELLED'].includes(o.status)
      ).length
      
      let feedbackCount = 0
      if (feedbackConfig?.feedbackEnabled) {
        feedbackCount = customerOrders.filter(o =>
          o.status === 'COMPLETED' && o.moodContext && !o.moodFeedbackGiven
        ).length
      }
      
      setOrderNotifications(activeCount + feedbackCount)
      const hasReady = customerOrders.some(o => o.status === 'READY')
      setHasOrderUpdates(hasReady || feedbackCount > 0)
    } catch (error) {
      console.error('Failed to check order updates:', error)
    }
  }, [user])

  // Real-time order update handler
  const handleOrderUpdate = useCallback((order: unknown) => {
    const orderData = order as { customerName?: string; deviceId?: string; status: string }
    const isMyOrder = 
      (user && (orderData.customerName === user.name || orderData.customerName === user.email)) ||
      orderData.deviceId === deviceId
    
    if (isMyOrder) {
      console.log('HomePage: Order update for me:', orderData.status)
      refreshOrderNotifications()
      if (orderData.status === 'READY') {
        playSuccessSound()
        vibrate([200, 100, 200])
        setHasOrderUpdates(true)
      }
    }
  }, [user, deviceId, refreshOrderNotifications])

  // Subscribe to real-time order events
  useOrderEvents({
    type: 'customer',
    onOrderUpdate: handleOrderUpdate
  })

  // Poll for order updates
  useEffect(() => {
    refreshOrderNotifications()
    const interval = setInterval(refreshOrderNotifications, 30000)
    return () => clearInterval(interval)
  }, [refreshOrderNotifications])

  const handleSelectMood = (mood: MoodType) => {
    setSelectedMood(mood)
    // Navigate to menu page with mood preselected
    navigate(`/menu?mood=${mood}`)
  }
  return (
    <ClientLayout>
      {/* Hero Section with Grid */}
      <section 
        className="relative min-h-[90vh] md:min-h-[85vh] flex items-center bg-cover bg-center pt-16"
        style={{ 
          backgroundImage: 'url(/assets/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Dark Overlay for better text readability */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.65) 0%, rgba(0, 0, 0, 0.45) 50%, rgba(0, 0, 0, 0.65) 100%)'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Left Content */}
            <div className="text-center lg:text-left order-2 lg:order-1">
              <div className="flex items-center justify-center lg:justify-start gap-3 mb-4 md:mb-6">
                <img src="/assets/logo.png" alt="BEEHIVE" className="h-16 w-16 md:h-20 md:w-20 object-contain drop-shadow-2xl" />
                <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold" style={{ color: '#F9C900' }}>
                  BEEHIVE
                </h1>
              </div>
              <p className="text-xl sm:text-2xl md:text-3xl font-semibold mb-3 md:mb-4 text-white">
                Enjoy your food with a relaxing ambiance
              </p>
              <p className="text-base sm:text-lg md:text-xl mb-6 md:mb-8 text-gray-300">
                As if you are in the comfort of your own homes
              </p>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center lg:justify-start">
                <Link to="/menu" className="w-full sm:w-auto">
                  <Button size="lg" className="w-full sm:w-auto shadow-xl hover:shadow-2xl transition-all text-black font-semibold" style={{ backgroundColor: '#F9C900' }}>
                    🍽️ Order Now
                  </Button>
                </Link>
                <Link to="/menu?showMood=true" className="w-full sm:w-auto">
                  <Button size="lg" variant="outline" className="w-full sm:w-auto border-2 shadow-xl hover:shadow-2xl transition-all bg-black/30 text-white font-semibold hover:bg-[#F9C900] hover:text-black hover:border-[#F9C900]" style={{ borderColor: '#F9C900' }}>
                    ✨ Mood-Based Menu
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right - Image Grid with 4 images */}
            <div className="grid grid-cols-2 gap-3 md:gap-4 order-1 lg:order-2">
              <div className="space-y-3 md:space-y-4">
                <div className="h-32 sm:h-40 md:h-48 rounded-xl overflow-hidden shadow-2xl">
                  <img src="/assets/menu1.jpg" alt="Delicious Menu" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="h-40 sm:h-52 md:h-64 rounded-xl overflow-hidden shadow-2xl">
                  <img src="/assets/people wearing christmast outfit in beehive place 2.jpg" alt="Happy Customers" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="space-y-3 md:space-y-4 pt-6 md:pt-8">
                <div className="h-40 sm:h-52 md:h-64 rounded-xl overflow-hidden shadow-2xl">
                  <img src="/assets/people eating and pool and counter.jpg" alt="Dining and Pool at BEEHIVE" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="h-32 sm:h-40 md:h-48 rounded-xl overflow-hidden shadow-2xl">
                  <img src="/assets/Gemini_Generated_Image_5et95m5et95m5et9.png" alt="Drinks" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Bottom gradient fade to next section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#FFFBF0] to-transparent"></div>
        
        {/* Scroll indicator */}
        <div className="absolute bottom-10 left-1/2 transform -translate-x-1/2 animate-bounce hidden md:block z-10">
          <div className="w-8 h-12 border-2 border-white/50 rounded-full flex justify-center pt-2">
            <div className="w-1.5 h-3 bg-white/70 rounded-full animate-pulse"></div>
          </div>
        </div>
      </section>

      {/* Mood-Based Menu Section */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#FFFBF0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <div className="flex items-center justify-center gap-2 md:gap-3 mb-3 md:mb-4">
              <Sparkles className="h-6 w-6 md:h-8 md:w-8" style={{ color: '#D4A000' }} />
              <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold" style={{ color: '#1a1a1a' }}>
                How are you feeling today?
              </h2>
            </div>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 md:mb-8">
              Let us recommend the perfect meal based on your mood
            </p>
          </div>

          {/* Mood Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4 mb-8 md:mb-12">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleSelectMood(mood.value)}
                className="p-4 md:p-6 rounded-xl border-2 border-yellow-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all hover:scale-105 hover:shadow-lg bg-white"
                style={{ borderColor: selectedMood === mood.value ? mood.color : undefined }}
              >
                <div className="text-3xl md:text-5xl mb-2 md:mb-3">{mood.emoji}</div>
                <h3 className="font-bold text-sm md:text-base mb-1">{mood.label}</h3>
                <p className="text-xs text-gray-600 line-clamp-2 hidden sm:block">{mood.description}</p>
              </button>
            ))}
          </div>

          <div className="text-center">
            <Link to="/menu">
              <Button size="lg" className="shadow-lg hover:shadow-xl transition-all text-black font-semibold" style={{ backgroundColor: '#F9C900' }}>
                🍴 Explore Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Kiosk Events Section */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#FFF8E1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            {/* Content */}
            <div className="order-2 lg:order-1">
              <div className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-3 sm:mb-4" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                <span className="font-semibold text-sm sm:text-base">🎪 Events & Kiosks</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6" style={{ color: '#000000' }}>
                BEEHIVE On-the-Go
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-4 sm:mb-6">
                Can't visit our main location? No problem! We bring BEEHIVE to you through our event kiosks.
              </p>
              <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F9C900' }}>
                    <span className="text-xl sm:text-2xl">🎉</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg mb-1">Festival Kiosks</h3>
                    <p className="text-gray-600 text-sm sm:text-base">Find us at local festivals, food fairs, and community events</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FF9A00', color: '#FFFFFF' }}>
                    <span className="text-xl sm:text-2xl">🏢</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg mb-1">Corporate Events</h3>
                    <p className="text-gray-600 text-sm sm:text-base">Book our kiosk for your office events and celebrations</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 sm:gap-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#E5AD3A' }}>
                    <span className="text-xl sm:text-2xl">🎓</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-base sm:text-lg mb-1">School & University Events</h3>
                    <p className="text-gray-600 text-sm sm:text-base">Special student-friendly pricing at campus events</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <Button size="lg" className="w-full sm:w-auto" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                  📅 View Event Schedule
                </Button>
                <Button size="lg" variant="outline" className="w-full sm:w-auto" style={{ borderColor: '#000000', color: '#000000' }}>
                  📞 Book Our Kiosk
                </Button>
              </div>
            </div>

            {/* Visual - 3 images showcase */}
            <div className="grid grid-cols-2 gap-3 sm:gap-4 order-1 lg:order-2">
              <div className="col-span-2">
                <div className="h-48 sm:h-56 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                  <img src="/assets/atiatihan festival (loc of kiosk).jpg" alt="Kiosk at Atiatihan Festival" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="h-36 sm:h-44 md:h-48 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/kiosk.jpg" alt="BEEHIVE Kiosk" className="w-full h-full object-cover" />
              </div>
              <div className="h-36 sm:h-44 md:h-48 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/venue of the concert (2024).jpg" alt="Concert Venue" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Showcase Section */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#FFFBF0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4" style={{ color: '#1a1a1a' }}>
              Our Popular Dishes
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Taste the favorites that keep our customers coming back
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            {[
              { img: 'menu4.jpg', name: 'Signature Dish' },
              { img: 'menu5.jpg', name: 'House Special' },
              { img: 'menu6.jpg', name: 'Chef\'s Choice' },
              { img: 'menu7.jpg', name: 'Daily Fresh' },
              { img: 'menu8.jpg', name: 'Premium Selection' },
              { img: 'menu9.jpg', name: 'Classic Favorite' },
              { img: 'menu10.jpg', name: 'New Addition' },
              { img: 'menu11.jpg', name: 'Best Seller' },
            ].map((item, index) => (
              <div key={index} className="group cursor-pointer">
                <div className="relative h-40 sm:h-52 md:h-64 rounded-lg sm:rounded-xl overflow-hidden shadow-lg mb-2 sm:mb-3">
                  <img 
                    src={`/assets/${item.img}`} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
                <h3 className="text-center font-semibold text-sm sm:text-base md:text-lg" style={{ color: '#000000' }}>{item.name}</h3>
              </div>
            ))}
          </div>

          <div className="text-center mt-8 md:mt-12">
            <Link to="/menu">
              <Button size="lg" className="text-white" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                🍴 View Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Drinks Section */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#FFF8E1' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
            <div className="grid grid-cols-2 gap-3 sm:gap-4 order-1">
              <div className="col-span-2 h-52 sm:h-64 md:h-80 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/drinks.jpg" alt="Drinks Collection" className="w-full h-full object-cover" />
              </div>
              <div className="h-40 sm:h-52 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/drink1.jpg" alt="Special Drink" className="w-full h-full object-cover" />
              </div>
              <div className="h-40 sm:h-52 md:h-64 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/holding drink in the hand.jpg" alt="Refreshing Beverage" className="w-full h-full object-cover" />
              </div>
            </div>

            <div className="order-2">
              <div className="inline-block px-3 py-1.5 sm:px-4 sm:py-2 rounded-full mb-3 sm:mb-4" style={{ backgroundColor: '#FF9A00', color: '#FFFFFF' }}>
                <span className="font-semibold text-sm sm:text-base">🥤 Refreshments</span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6" style={{ color: '#000000' }}>
                Thirst-Quenching Beverages
              </h2>
              <p className="text-base sm:text-lg md:text-xl text-gray-700 mb-4 sm:mb-6">
                Complement your meal with our selection of refreshing drinks, from classic favorites to specialty creations.
              </p>
              <ul className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">☕</span>
                  <span className="text-base sm:text-lg">Specialty Coffee & Tea</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">🧃</span>
                  <span className="text-base sm:text-lg">Fresh Fruit Juices</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">🥤</span>
                  <span className="text-base sm:text-lg">Signature Smoothies</span>
                </li>
                <li className="flex items-center gap-2 sm:gap-3">
                  <span className="text-xl sm:text-2xl">🍹</span>
                  <span className="text-base sm:text-lg">Seasonal Specials</span>
                </li>
              </ul>
              <Link to="/menu">
                <Button size="lg" className="w-full sm:w-auto" style={{ backgroundColor: '#FF9A00', color: '#FFFFFF' }}>
                  🥤 Explore Drinks Menu
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-16 md:py-20" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 md:mb-12">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-3 md:mb-4" style={{ color: '#000000' }}>
              📍 Find Us
            </h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-600">
              Visit us at our location and experience BEEHIVE in person
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-12 items-start">
            {/* Map */}
            <div className="w-full h-64 sm:h-80 md:h-96 rounded-xl sm:rounded-2xl overflow-hidden shadow-2xl border-2" style={{ borderColor: '#F9C900' }}>
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m17!1m12!1m3!1d246.40374729385515!2d122.98281888859265!3d10.656679634063807!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m2!1m1!2zMTDCsDM5JzI0LjEiTiAxMjLCsDU4JzU4LjIiRQ!5e0!3m2!1sen!2sph!4v1733742000000!5m2!1sen!2sph"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="BEEHIVE Location"
              />
            </div>

            {/* Location Details */}
            <div className="space-y-4 sm:space-y-6">
              <Card className="border-2 hover:shadow-xl transition-shadow" style={{ borderColor: '#F9C900' }}>
                <CardHeader className="pb-3 sm:pb-6">
                  <CardTitle className="flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl">
                    <span className="text-2xl sm:text-3xl">🏪</span>
                    BEEHIVE Main Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">📍</span>
                    <div>
                      <p className="font-semibold text-base sm:text-lg mb-1">Address</p>
                      <p className="text-gray-600 text-sm sm:text-base">Gabayoyo's Residence, MW4M+P74</p>
                      <p className="text-gray-600 text-sm sm:text-base">Kahirup Village, Bacolod</p>
                      <p className="text-gray-600 text-sm sm:text-base">6100 Negros Occidental</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">⏰</span>
                    <div>
                      <p className="font-semibold text-base sm:text-lg mb-1">Business Hours</p>
                      <p className="text-gray-600 text-sm sm:text-base">Sunday - Friday: 11:00 AM - 9:00 PM</p>
                      <p className="text-xs sm:text-sm text-gray-500 mt-1">Closed on Saturdays</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">📞</span>
                    <div>
                      <p className="font-semibold text-base sm:text-lg mb-1">Contact</p>
                      <p className="text-gray-600 text-sm sm:text-base">Phone: +63 966 641 4788</p>
                      <a href="https://www.facebook.com/BEEHIVECAFEANDRESTO" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm sm:text-base break-all">facebook.com/BEEHIVECAFEANDRESTO</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-2 sm:gap-3">
                    <span className="text-xl sm:text-2xl">🎱</span>
                    <div>
                      <p className="font-semibold text-base sm:text-lg mb-1">Amenities</p>
                      <div className="flex flex-wrap gap-1.5 sm:gap-2 mt-2">
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium" style={{ backgroundColor: '#FFF8E1', color: '#000000' }}>Pool Tables</span>
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium" style={{ backgroundColor: '#FFF8E1', color: '#000000' }}>Free WiFi</span>
                        <span className="px-2 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium" style={{ backgroundColor: '#FFF8E1', color: '#000000' }}>Parking</span>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-3 sm:mt-4" size="lg" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                    🧭 Get Directions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-20" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 sm:mb-6" style={{ color: '#F9C900' }}>
            Ready to Experience BEEHIVE?
          </h2>
          <p className="text-base sm:text-lg md:text-xl mb-6 sm:mb-8 text-gray-300">
            Join thousands of satisfied customers who made BEEHIVE their comfort food destination
          </p>
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
            <Link to="/menu" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto font-semibold text-black" style={{ backgroundColor: '#F9C900' }}>
                🍽️ Start Ordering
              </Button>
            </Link>
            <Link to="/register" className="w-full sm:w-auto">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full sm:w-auto border-2 font-semibold hover:bg-[#F9C900] hover:text-black hover:border-[#F9C900] bg-transparent" 
                style={{ borderColor: '#F9C900', color: '#F9C900' }}
              >
                ⭐ Create an Account
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Floating Bee Orders Button */}
      {user && (
        <button
          onClick={() => setShowMyOrders(true)}
          className={`fixed bottom-6 left-6 z-50 group transition-all duration-300 ${
            hasOrderUpdates || orderNotifications > 0 ? 'animate-bounce-slow' : ''
          }`}
        >
          <div className={`w-14 h-14 rounded-full shadow-xl flex items-center justify-center transition-all duration-300 ${
            orderNotifications > 0 
              ? 'bg-gradient-to-br from-yellow-400 to-orange-400 border-2 border-yellow-300' 
              : 'bg-white border-2 border-gray-200 hover:border-yellow-400'
          } hover:shadow-2xl hover:scale-110`}>
            <span className={`text-2xl transition-transform duration-300 ${orderNotifications > 0 ? 'animate-wiggle' : 'group-hover:scale-110'}`}>
              🐝
            </span>
          </div>
          
          {orderNotifications > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[24px] h-6 px-1.5 rounded-full flex items-center justify-center text-xs font-bold text-white bg-red-500 shadow-lg">
              {orderNotifications}
            </span>
          )}
          
          {hasOrderUpdates && (
            <span className="absolute -top-2 -left-2 w-5 h-5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-5 w-5 bg-green-500 items-center justify-center shadow-sm">
                <Bell className="h-2.5 w-2.5 text-white" />
              </span>
            </span>
          )}
          
          <span className="absolute left-full ml-2 px-2 py-1 bg-black text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 whitespace-nowrap transition-opacity shadow-lg">
            My Orders
          </span>
        </button>
      )}

      {/* My Orders Modal */}
      <MyOrdersModal
        open={showMyOrders}
        onOpenChange={setShowMyOrders}
        onFeedbackSubmitted={refreshOrderNotifications}
      />

      {/* Custom animation styles */}
      <style>{`
        @keyframes bounce-slow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes wiggle {
          0%, 100% { transform: rotate(0deg); }
          25% { transform: rotate(-5deg); }
          75% { transform: rotate(5deg); }
        }
        .animate-bounce-slow { animation: bounce-slow 2s ease-in-out infinite; }
        .animate-wiggle { animation: wiggle 0.5s ease-in-out infinite; }
      `}</style>
    </ClientLayout>
  )
}
