import { ClientLayout } from '../../components/layout/ClientLayout'
import { Clock, MapPin, Phone, Mail, Heart, Users, Award, Coffee } from 'lucide-react'

export const AboutPage = () => {
  return (
    <ClientLayout>
      <div className="min-h-screen" style={{ backgroundColor: '#FFFBF0' }}>
        {/* Hero Section */}
        <div 
          className="relative py-20 md:py-28 text-white bg-cover bg-center"
          style={{ backgroundImage: 'url(/assets/background.jpg)' }}
        >
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg, rgba(0, 0, 0, 0.7) 0%, rgba(0, 0, 0, 0.5) 100%)' }}></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <img src="/assets/logo.png" alt="BEEHIVE" className="h-20 w-20 md:h-24 md:w-24 object-contain drop-shadow-2xl" />
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold mb-4" style={{ color: '#F9C900' }}>Welcome to BEEHIVE</h1>
            <p className="text-lg md:text-xl text-gray-200 max-w-2xl mx-auto">
              Where good food meets great vibes. A cozy spot for pizza, drinks, and unforgettable moments.
            </p>
          </div>
          {/* Bottom gradient fade */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-[#FFFBF0] to-transparent"></div>
        </div>

        {/* Our Story Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center mb-16 md:mb-20">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold mb-6" style={{ color: '#D4A000' }}>Our Story</h2>
              <p className="text-gray-700 mb-4 leading-relaxed text-sm md:text-base">
                BEEHIVE began as a spontaneous idea among three friends who never imagined their whim 
                would transform into something extraordinary. What started as a casual conversation turned 
                into a thriving business that has captured the hearts of our community.
              </p>
              <p className="text-gray-700 mb-4 leading-relaxed text-sm md:text-base">
                Our name was inspired by the location itself – a charming spot surrounded by beautiful trees 
                that naturally attracted bees. We saw a beautiful parallel: just as bees are drawn to their 
                hive, we wanted to create a place where people would feel naturally drawn to gather, connect, 
                and enjoy good food together.
              </p>
              <p className="text-gray-700 mb-4 leading-relaxed text-sm md:text-base">
                In our concept, <span className="font-semibold" style={{ color: '#D4A000' }}>you are the bees</span> – 
                our valued customers who bring life and energy to this space. 
                <span className="font-semibold" style={{ color: '#D4A000' }}> BEEHIVE is your hive</span> – 
                a welcoming place where you can always find comfort, nourishment, and community.
              </p>
              <p className="text-gray-700 leading-relaxed text-sm md:text-base">
                From our signature pizzas to our innovative mood-based recommendations, every detail reflects 
                our commitment to creating more than just a restaurant – we've built a home where memories 
                are made and friendships flourish.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center border border-yellow-100">
                <Coffee className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3" style={{ color: '#D4A000' }} />
                <h3 className="font-bold text-xl md:text-2xl mb-1">50+</h3>
                <p className="text-gray-600 text-xs md:text-sm">Menu Items</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center border border-yellow-100">
                <Users className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3" style={{ color: '#D4A000' }} />
                <h3 className="font-bold text-xl md:text-2xl mb-1">1000+</h3>
                <p className="text-gray-600 text-xs md:text-sm">Happy Customers</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center border border-yellow-100">
                <Heart className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3" style={{ color: '#D4A000' }} />
                <h3 className="font-bold text-xl md:text-2xl mb-1">100%</h3>
                <p className="text-gray-600 text-xs md:text-sm">Made with Love</p>
              </div>
              <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center border border-yellow-100">
                <Award className="h-10 w-10 md:h-12 md:w-12 mx-auto mb-2 md:mb-3" style={{ color: '#D4A000' }} />
                <h3 className="font-bold text-xl md:text-2xl mb-1">4.8★</h3>
                <p className="text-gray-600 text-xs md:text-sm">Customer Rating</p>
              </div>
            </div>
          </div>

          {/* What Makes Us Special */}
          <div className="mb-16 md:mb-20">
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-8 md:mb-12" style={{ color: '#D4A000' }}>
              What Makes Us Special
            </h2>
            <div className="grid md:grid-cols-3 gap-6 md:gap-8">
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-yellow-100">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FFF8E1' }}>
                  <span className="text-2xl md:text-3xl">🍕</span>
                </div>
                <h3 className="font-bold text-lg md:text-xl mb-3">Handcrafted Pizzas</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Every pizza is made fresh with premium ingredients and our signature dough recipe, 
                  baked to perfection in our stone oven.
                </p>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-yellow-100">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FFF8E1' }}>
                  <span className="text-2xl md:text-3xl">🎭</span>
                </div>
                <h3 className="font-bold text-lg md:text-xl mb-3">Mood-Based Menu</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  Our innovative AI-powered system recommends foods based on your mood, backed by 
                  nutritional science to help you feel your best.
                </p>
              </div>
              <div className="bg-white p-6 md:p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow border border-yellow-100">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mb-4" style={{ backgroundColor: '#FFF8E1' }}>
                  <span className="text-2xl md:text-3xl">☕</span>
                </div>
                <h3 className="font-bold text-lg md:text-xl mb-3">Specialty Drinks</h3>
                <p className="text-gray-600 text-sm md:text-base">
                  From artisan coffee to refreshing smoothies and unique matcha creations, 
                  we have the perfect drink for every moment.
                </p>
              </div>
            </div>
          </div>

          {/* Contact & Hours Section */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            {/* Contact Information */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-yellow-100">
              <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: '#D4A000' }}>Get In Touch</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <MapPin className="h-5 w-5 md:h-6 md:w-6 mt-1" style={{ color: '#D4A000' }} />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">Location</h3>
                    <p className="text-gray-600 text-sm md:text-base">
                      Gabayoyo's Residence, MW4M+P74<br />
                      Kahirup Village, Bacolod<br />
                      6100 Negros Occidental
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <Phone className="h-5 w-5 md:h-6 md:w-6 mt-1" style={{ color: '#D4A000' }} />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">Phone</h3>
                    <p className="text-gray-600 text-sm md:text-base">+63 966 641 4788</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 md:gap-4">
                  <Mail className="h-5 w-5 md:h-6 md:w-6 mt-1" style={{ color: '#D4A000' }} />
                  <div>
                    <h3 className="font-semibold mb-1 text-sm md:text-base">Social Media</h3>
                    <a href="https://www.facebook.com/BEEHIVECAFEANDRESTO" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 hover:underline text-sm md:text-base break-all">facebook.com/BEEHIVECAFEANDRESTO</a>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-white p-6 md:p-8 rounded-xl shadow-md border border-yellow-100">
              <h2 className="text-xl md:text-2xl font-bold mb-6" style={{ color: '#D4A000' }}>Business Hours</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-3 md:gap-4">
                  <Clock className="h-5 w-5 md:h-6 md:w-6" style={{ color: '#D4A000' }} />
                  <span className="font-semibold text-sm md:text-base">Operating Hours</span>
                </div>
                <div className="pl-8 md:pl-10 space-y-2">
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-600">Sunday - Friday</span>
                    <span className="font-medium">11:00 AM - 9:00 PM</span>
                  </div>
                  <div className="flex justify-between text-sm md:text-base">
                    <span className="text-gray-600">Saturday</span>
                    <span className="font-medium text-red-500">Closed</span>
                  </div>
                </div>
                <div className="mt-6 p-4 rounded-lg border-2" style={{ backgroundColor: '#FFF8E1', borderColor: '#F9C900' }}>
                  <p className="text-sm text-gray-700 text-center">
                    ⚡ Now accepting online orders! Browse our menu and order from your phone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Statement */}
          <div className="mt-16 rounded-2xl p-8 md:p-12 text-center text-white" style={{ background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%)' }}>
            <h2 className="text-2xl md:text-3xl font-bold mb-4" style={{ color: '#F9C900' }}>Our Mission</h2>
            <p className="text-base md:text-lg text-gray-300 max-w-3xl mx-auto leading-relaxed">
              To create memorable dining experiences that nourish both body and soul. We're committed to 
              serving quality food with exceptional service, fostering a warm community space where 
              everyone feels welcome, and using innovative technology to enhance your dining journey.
            </p>
          </div>
        </div>
      </div>
    </ClientLayout>
  )
}
