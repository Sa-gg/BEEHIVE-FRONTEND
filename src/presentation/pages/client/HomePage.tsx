import { ClientLayout } from '../../components/layout/ClientLayout'
import { Button } from '../../components/common/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/common/ui/card'
import { Link, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { MOOD_OPTIONS, type MoodType } from '../../../shared/utils/moodSystem'
import { Sparkles } from 'lucide-react'

export const HomePage = () => {
  const navigate = useNavigate()
  const [selectedMood, setSelectedMood] = useState<MoodType | null>(null)

  const handleSelectMood = (mood: MoodType) => {
    setSelectedMood(mood)
    // Navigate to menu page with mood preselected
    navigate(`/menu?mood=${mood}`)
  }
  return (
    <ClientLayout>
      {/* Hero Section with Grid */}
      <section 
        className="relative py-20 bg-cover bg-center"
        style={{ 
          backgroundImage: 'url(/assets/background.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {/* Gradient Overlay to darken the background */}
        <div 
          className="absolute inset-0" 
          style={{ 
            background: 'linear-gradient(135deg, rgba(249, 201, 0, 0.25) 0%, rgba(255, 154, 0, 0.35) 100%)'
          }}
        />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="backdrop-blur-md p-8 rounded-2xl shadow-2xl" style={{ backgroundColor: 'rgba(255, 255, 255, 0.6)' }}>
              <div className="flex items-center gap-3 mb-4">
                <img src="/assets/logo.png" alt="BEEHIVE" className="h-20 w-20 object-contain" />
                <h1 className="text-5xl md:text-6xl font-bold" style={{ color: '#000000' }}>
                  BEEHIVE
                </h1>
              </div>
              <p className="text-2xl md:text-3xl font-semibold mb-4" style={{ color: '#333333' }}>
                Enjoy your food with a relaxing ambiance
              </p>
              <p className="text-lg md:text-xl mb-8" style={{ color: '#555555' }}>
                As if you are in the comfort of your own homes
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/menu">
                  <Button size="lg" className="text-white hover:opacity-90 shadow-lg" style={{ backgroundColor: '#000000' }}>
                    🍽️ Order Now
                  </Button>
                </Link>
                <Link to="/menu">
                  <Button size="lg" className="border-2 shadow-lg" style={{ borderColor: '#F9C900', color: '#000000', backgroundColor: '#F9C900' }}>
                    ✨ Mood-Based Menu
                  </Button>
                </Link>
              </div>
            </div>

            {/* Right - Image Grid with 4 images */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-4">
                <div className="h-48 rounded-lg overflow-hidden shadow-2xl">
                  <img src="/assets/menu1.jpg" alt="Delicious Menu" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="h-64 rounded-lg overflow-hidden shadow-2xl">
                  <img src="/assets/people wearing christmast outfit in beehive place 2.jpg" alt="Happy Customers" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
              <div className="space-y-4 pt-8">
                <div className="h-64 rounded-lg overflow-hidden shadow-2xl">
                  <img src="/assets/people eating and pool and counter.jpg" alt="Dining and Pool at BEEHIVE" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
                <div className="h-48 rounded-lg overflow-hidden shadow-2xl">
                  <img src="/assets/Gemini_Generated_Image_5et95m5et95m5et9.png" alt="Drinks" className="w-full h-full object-cover hover:scale-110 transition-transform duration-300" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Mood-Based Menu Section */}
      <section className="py-20 bg-linear-to-b from-yellow-50 to-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Sparkles className="h-8 w-8" style={{ color: '#F9C900' }} />
              <h2 className="text-4xl md:text-5xl font-bold" style={{ color: '#000000' }}>
                How are you feeling today?
              </h2>
            </div>
            <p className="text-xl text-gray-600 mb-8">
              Let us recommend the perfect meal based on your mood
            </p>
          </div>

          {/* Mood Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-12">
            {MOOD_OPTIONS.map((mood) => (
              <button
                key={mood.value}
                onClick={() => handleSelectMood(mood.value)}
                className="p-6 rounded-xl border-2 border-gray-200 hover:border-yellow-400 hover:bg-yellow-50 transition-all hover:scale-105 hover:shadow-lg bg-white"
                style={{ borderColor: selectedMood === mood.value ? mood.color : undefined }}
              >
                <div className="text-5xl mb-3">{mood.emoji}</div>
                <h3 className="font-bold text-base mb-1">{mood.label}</h3>
                <p className="text-xs text-gray-600 line-clamp-2">{mood.description}</p>
              </button>
            ))}
          </div>

          <div className="text-center">
            <Link to="/menu">
              <Button size="lg" className="text-white shadow-lg hover:shadow-xl transition-all" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                🍴 Explore Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Loyalty & Coupons Section */}
      <section className="py-20" style={{ backgroundColor: '#FFFBF0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#000000' }}>
              Rewards & Exclusive Offers
            </h2>
            <p className="text-xl text-gray-600">
              Join our loyalty program and enjoy special perks!
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Loyalty Card */}
            <Card className="border-2 hover:shadow-2xl transition-all" style={{ borderColor: '#F9C900' }}>
              <CardHeader>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: '#F9C900' }}>
                  ⭐
                </div>
                <CardTitle className="text-center text-2xl">Loyalty Card</CardTitle>
                <CardDescription className="text-center">
                  Earn rewards with every order
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🥤</span>
                  <p className="text-sm font-bold" style={{ color: '#F9C900' }}>10 orders = FREE Beverage!</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎁</span>
                  <p className="text-sm">Track your progress with every order</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🏆</span>
                  <p className="text-sm">Exclusive member-only rewards</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-2xl">🎂</span>
                  <p className="text-sm">Birthday month special treat</p>
                </div>
                <Button className="w-full mt-4" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                  Join Now
                </Button>
              </CardContent>
            </Card>

            {/* Active Coupons */}
            <Card className="border-2 hover:shadow-2xl transition-all" style={{ borderColor: '#FF9A00' }}>
              <CardHeader>
                <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center text-3xl" style={{ backgroundColor: '#FF9A00', color: '#FFFFFF' }}>
                  🎟️
                </div>
                <CardTitle className="text-center text-2xl">Active Coupons</CardTitle>
                <CardDescription className="text-center">
                  Limited time offers available now
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="p-3 rounded-lg border-2 border-dashed" style={{ borderColor: '#FF9A00', backgroundColor: '#FFF8F0' }}>
                  <p className="font-bold text-lg" style={{ color: '#FF9A00' }}>20% OFF</p>
                  <p className="text-xs text-gray-600">On orders above ₱500</p>
                  <p className="text-xs font-mono mt-1">CODE: BEEHIVE20</p>
                </div>
                <div className="p-3 rounded-lg border-2 border-dashed" style={{ borderColor: '#E5AD3A', backgroundColor: '#FFFBF0' }}>
                  <p className="font-bold text-lg" style={{ color: '#E5AD3A' }}>FREE DELIVERY</p>
                  <p className="text-xs text-gray-600">On orders above ₱300</p>
                  <p className="text-xs font-mono mt-1">CODE: FREEDEL</p>
                </div>
                <Button className="w-full mt-4" variant="outline" style={{ borderColor: '#FF9A00', color: '#FF9A00' }}>
                  View All Coupons
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Kiosk Events Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* Content */}
            <div>
              <div className="inline-block px-4 py-2 rounded-full mb-4" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                <span className="font-semibold">🎪 Events & Kiosks</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#000000' }}>
                BEEHIVE On-the-Go
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                Can't visit our main location? No problem! We bring BEEHIVE to you through our event kiosks.
              </p>
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#F9C900' }}>
                    <span className="text-2xl">🎉</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Festival Kiosks</h3>
                    <p className="text-gray-600">Find us at local festivals, food fairs, and community events</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#FF9A00', color: '#FFFFFF' }}>
                    <span className="text-2xl">🏢</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Corporate Events</h3>
                    <p className="text-gray-600">Book our kiosk for your office events and celebrations</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#E5AD3A' }}>
                    <span className="text-2xl">🎓</span>
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">School & University Events</h3>
                    <p className="text-gray-600">Special student-friendly pricing at campus events</p>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap gap-4">
                <Button size="lg" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                  📅 View Event Schedule
                </Button>
                <Button size="lg" variant="outline" style={{ borderColor: '#000000', color: '#000000' }}>
                  📞 Book Our Kiosk
                </Button>
              </div>
            </div>

            {/* Visual - 3 images showcase */}
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <div className="h-64 rounded-2xl overflow-hidden shadow-2xl">
                  <img src="/assets/atiatihan festival (loc of kiosk).jpg" alt="Kiosk at Atiatihan Festival" className="w-full h-full object-cover" />
                </div>
              </div>
              <div className="h-48 rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/kiosk.jpg" alt="BEEHIVE Kiosk" className="w-full h-full object-cover" />
              </div>
              <div className="h-48 rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/venue of the concert (2024).jpg" alt="Concert Venue" className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Menu Showcase Section */}
      <section className="py-20" style={{ backgroundColor: '#FFFBF0' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#000000' }}>
              Our Popular Dishes
            </h2>
            <p className="text-xl text-gray-600">
              Taste the favorites that keep our customers coming back
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
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
                <div className="relative h-64 rounded-xl overflow-hidden shadow-lg mb-3">
                  <img 
                    src={`/assets/${item.img}`} 
                    alt={item.name} 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300" 
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-all duration-300" />
                </div>
                <h3 className="text-center font-semibold text-lg" style={{ color: '#000000' }}>{item.name}</h3>
              </div>
            ))}
          </div>

          <div className="text-center mt-12">
            <Link to="/menu">
              <Button size="lg" className="text-white" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                🍴 View Full Menu
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Drinks Section */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 h-80 rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/drinks.jpg" alt="Drinks Collection" className="w-full h-full object-cover" />
              </div>
              <div className="h-64 rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/drink1.jpg" alt="Special Drink" className="w-full h-full object-cover" />
              </div>
              <div className="h-64 rounded-2xl overflow-hidden shadow-2xl">
                <img src="/assets/holding drink in the hand.jpg" alt="Refreshing Beverage" className="w-full h-full object-cover" />
              </div>
            </div>

            <div>
              <div className="inline-block px-4 py-2 rounded-full mb-4" style={{ backgroundColor: '#FF9A00', color: '#FFFFFF' }}>
                <span className="font-semibold">🥤 Refreshments</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#000000' }}>
                Thirst-Quenching Beverages
              </h2>
              <p className="text-xl text-gray-700 mb-6">
                Complement your meal with our selection of refreshing drinks, from classic favorites to specialty creations.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-center gap-3">
                  <span className="text-2xl">☕</span>
                  <span className="text-lg">Specialty Coffee & Tea</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">🧃</span>
                  <span className="text-lg">Fresh Fruit Juices</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">🥤</span>
                  <span className="text-lg">Signature Smoothies</span>
                </li>
                <li className="flex items-center gap-3">
                  <span className="text-2xl">🍹</span>
                  <span className="text-lg">Seasonal Specials</span>
                </li>
              </ul>
              <Link to="/menu">
                <Button size="lg" style={{ backgroundColor: '#FF9A00', color: '#FFFFFF' }}>
                  🥤 Explore Drinks Menu
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Location Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #FFFBF0 0%, #FFF8E1 100%)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-5xl font-bold mb-4" style={{ color: '#000000' }}>
              📍 Find Us
            </h2>
            <p className="text-xl text-gray-600">
              Visit us at our location and experience BEEHIVE in person
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            {/* Map */}
            <div className="w-full h-96 rounded-2xl overflow-hidden shadow-2xl border-2" style={{ borderColor: '#F9C900' }}>
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
            <div className="space-y-6">
              <Card className="border-2 hover:shadow-xl transition-shadow" style={{ borderColor: '#F9C900' }}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-2xl">
                    <span className="text-3xl">🏪</span>
                    BEEHIVE Main Location
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📍</span>
                    <div>
                      <p className="font-semibold text-lg mb-1">Address</p>
                      <p className="text-gray-600">Gabayoyo's Residence, MW4M+P74</p>
                      <p className="text-gray-600">Kahirup Village, Bacolod</p>
                      <p className="text-gray-600">6100 Negros Occidental</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⏰</span>
                    <div>
                      <p className="font-semibold text-lg mb-1">Business Hours</p>
                      <p className="text-gray-600">Sunday - Friday: 11:00 AM - 9:00 PM</p>
                      <p className="text-sm text-gray-500 mt-1">Closed on Saturdays</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">📞</span>
                    <div>
                      <p className="font-semibold text-lg mb-1">Contact</p>
                      <p className="text-gray-600">Phone: +63 966 641 4788</p>
                      <a href="https://www.facebook.com/BEEHIVECAFEANDRESTO" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline">facebook.com/BEEHIVECAFEANDRESTO</a>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🎱</span>
                    <div>
                      <p className="font-semibold text-lg mb-1">Amenities</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#FFF8E1', color: '#000000' }}>Pool Tables</span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#FFF8E1', color: '#000000' }}>Free WiFi</span>
                        <span className="px-3 py-1 rounded-full text-sm font-medium" style={{ backgroundColor: '#FFF8E1', color: '#000000' }}>Parking</span>
                      </div>
                    </div>
                  </div>
                  <Button className="w-full mt-4" size="lg" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                    🧭 Get Directions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20" style={{ background: 'linear-gradient(135deg, #000000 0%, #333333 100%)' }}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold mb-6" style={{ color: '#F9C900' }}>
            Ready to Experience BEEHIVE?
          </h2>
          <p className="text-xl mb-8" style={{ color: '#FFFFFF' }}>
            Join thousands of satisfied customers who made BEEHIVE their comfort food destination
          </p>
          <div className="flex flex-wrap gap-4 justify-center">
            <Link to="/menu">
              <Button size="lg" className="font-medium" style={{ backgroundColor: '#F9C900', color: '#000000' }}>
                🍽️ Start Ordering
              </Button>
            </Link>
            <Link to="/register">
              <Button size="lg" variant="outline" className="border-2 font-medium hover:bg-[#F9C900] hover:text-black" style={{ borderColor: '#FFFFFF', backgroundColor: '#000000', color: '#FFFFFF' }}>
                ⭐ Join Loyalty Program
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </ClientLayout>
  )
}
