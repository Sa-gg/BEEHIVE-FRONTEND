import { ClientLayout } from '../../components/layout/ClientLayout'
import { Clock, MapPin, Phone, Mail, Heart, Users, Award, Coffee } from 'lucide-react'

export const AboutPage = () => {
  return (
    <ClientLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <div className="relative bg-linear-to-br from-yellow-400 via-yellow-500 to-orange-500 text-white py-20">
          <div className="absolute inset-0 bg-black opacity-10"></div>
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <div className="flex justify-center mb-6">
              <img src="/src/assets/logo.png" alt="BEEHIVE" className="h-24 w-24 object-contain" />
            </div>
            <h1 className="text-5xl font-bold mb-4">Welcome to BEEHIVE</h1>
            <p className="text-xl text-yellow-50 max-w-2xl mx-auto">
              Where good food meets great vibes. A cozy spot for pizza, drinks, and unforgettable moments.
            </p>
          </div>
        </div>

        {/* Our Story Section */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h2 className="text-3xl font-bold mb-6" style={{ color: '#F9C900' }}>Our Story</h2>
              <p className="text-gray-700 mb-4 leading-relaxed">
                BEEHIVE began as a spontaneous idea among three friends who never imagined their whim 
                would transform into something extraordinary. What started as a casual conversation turned 
                into a thriving business that has captured the hearts of our community.
              </p>
              <p className="text-gray-700 mb-4 leading-relaxed">
                Our name was inspired by the location itself – a charming spot surrounded by beautiful trees 
                that naturally attracted bees. We saw a beautiful parallel: just as bees are drawn to their 
                hive, we wanted to create a place where people would feel naturally drawn to gather, connect, 
                and enjoy good food together.
              </p>
              <p className="text-gray-700 mb-4 leading-relaxed">
                In our concept, <span className="font-semibold" style={{ color: '#F9C900' }}>you are the bees</span> – 
                our valued customers who bring life and energy to this space. 
                <span className="font-semibold" style={{ color: '#F9C900' }}> BEEHIVE is your hive</span> – 
                a welcoming place where you can always find comfort, nourishment, and community.
              </p>
              <p className="text-gray-700 leading-relaxed">
                From our signature pizzas to our innovative mood-based recommendations, every detail reflects 
                our commitment to creating more than just a restaurant – we've built a home where memories 
                are made and friendships flourish.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <Coffee className="h-12 w-12 mx-auto mb-3" style={{ color: '#F9C900' }} />
                <h3 className="font-bold text-2xl mb-1">50+</h3>
                <p className="text-gray-600 text-sm">Menu Items</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <Users className="h-12 w-12 mx-auto mb-3" style={{ color: '#F9C900' }} />
                <h3 className="font-bold text-2xl mb-1">1000+</h3>
                <p className="text-gray-600 text-sm">Happy Customers</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <Heart className="h-12 w-12 mx-auto mb-3" style={{ color: '#F9C900' }} />
                <h3 className="font-bold text-2xl mb-1">100%</h3>
                <p className="text-gray-600 text-sm">Made with Love</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-md text-center">
                <Award className="h-12 w-12 mx-auto mb-3" style={{ color: '#F9C900' }} />
                <h3 className="font-bold text-2xl mb-1">4.8★</h3>
                <p className="text-gray-600 text-sm">Customer Rating</p>
              </div>
            </div>
          </div>

          {/* What Makes Us Special */}
          <div className="mb-20">
            <h2 className="text-3xl font-bold text-center mb-12" style={{ color: '#F9C900' }}>
              What Makes Us Special
            </h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🍕</span>
                </div>
                <h3 className="font-bold text-xl mb-3">Handcrafted Pizzas</h3>
                <p className="text-gray-600">
                  Every pizza is made fresh with premium ingredients and our signature dough recipe, 
                  baked to perfection in our stone oven.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">🎭</span>
                </div>
                <h3 className="font-bold text-xl mb-3">Mood-Based Menu</h3>
                <p className="text-gray-600">
                  Our innovative AI-powered system recommends foods based on your mood, backed by 
                  nutritional science to help you feel your best.
                </p>
              </div>
              <div className="bg-white p-8 rounded-xl shadow-md hover:shadow-xl transition-shadow">
                <div className="bg-yellow-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                  <span className="text-3xl">☕</span>
                </div>
                <h3 className="font-bold text-xl mb-3">Specialty Drinks</h3>
                <p className="text-gray-600">
                  From artisan coffee to refreshing smoothies and unique matcha creations, 
                  we have the perfect drink for every moment.
                </p>
              </div>
            </div>
          </div>

          {/* Contact & Hours Section */}
          <div className="grid md:grid-cols-2 gap-8">
            {/* Contact Information */}
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#F9C900' }}>Get In Touch</h2>
              <div className="space-y-4">
                <div className="flex items-start gap-4">
                  <MapPin className="h-6 w-6 mt-1" style={{ color: '#F9C900' }} />
                  <div>
                    <h3 className="font-semibold mb-1">Location</h3>
                    <p className="text-gray-600">
                      123 Honey Street, Buzzville<br />
                      Metro Manila, Philippines
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Phone className="h-6 w-6 mt-1" style={{ color: '#F9C900' }} />
                  <div>
                    <h3 className="font-semibold mb-1">Phone</h3>
                    <p className="text-gray-600">+63 912 345 6789</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <Mail className="h-6 w-6 mt-1" style={{ color: '#F9C900' }} />
                  <div>
                    <h3 className="font-semibold mb-1">Email</h3>
                    <p className="text-gray-600">hello@beehive.ph</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Business Hours */}
            <div className="bg-white p-8 rounded-xl shadow-md">
              <h2 className="text-2xl font-bold mb-6" style={{ color: '#F9C900' }}>Business Hours</h2>
              <div className="space-y-3">
                <div className="flex items-center gap-4">
                  <Clock className="h-6 w-6" style={{ color: '#F9C900' }} />
                  <span className="font-semibold">Operating Hours</span>
                </div>
                <div className="pl-10 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monday - Thursday</span>
                    <span className="font-medium">10:00 AM - 10:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Friday - Saturday</span>
                    <span className="font-medium">10:00 AM - 11:00 PM</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sunday</span>
                    <span className="font-medium">11:00 AM - 9:00 PM</span>
                  </div>
                </div>
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                  <p className="text-sm text-gray-700 text-center">
                    ⚡ Now accepting online orders! Browse our menu and order from your phone.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Mission Statement */}
          <div className="mt-16 bg-linear-to-r from-yellow-400 to-orange-400 rounded-2xl p-12 text-center text-white">
            <h2 className="text-3xl font-bold mb-4">Our Mission</h2>
            <p className="text-lg text-yellow-50 max-w-3xl mx-auto leading-relaxed">
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
