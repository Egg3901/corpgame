import Link from 'next/link';
import Layout from '@/components/Layout';
import { 
  Clock, 
  Building2, 
  Target, 
  Users, 
  TrendingUp, 
  Settings,
  ArrowRight,
  Sparkles
} from 'lucide-react';

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen">
        {/* Hero Section with Background Image */}
        <div className="relative overflow-hidden bg-gradient-to-br from-corporate-blue via-blue-600 to-indigo-700">
          {/* Background Image Overlay */}
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-20"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'
            }}
          />
          
          {/* Animated Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-900/50 via-transparent to-indigo-900/50" />
          
          {/* Floating Elements */}
          <div className="absolute top-20 left-10 w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob" />
          <div className="absolute top-40 right-10 w-72 h-72 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000" />
          <div className="absolute -bottom-8 left-1/2 w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000" />
          
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
            <div className="text-center">
              {/* Icon Badge */}
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-md rounded-full mb-8 border border-white/20">
                <Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
                <span className="text-white text-sm font-medium">Strategic Business Simulation</span>
              </div>
              
              <h1 className="text-6xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
                Corporate Sim
              </h1>
              <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-3xl mx-auto leading-relaxed">
                Build your corporate empire in this strategic multiplayer simulation game.
                Make critical business decisions and compete with other players.
              </p>
              
              <div className="flex flex-col sm:flex-row justify-center gap-4">
                <Link
                  href="/register"
                  className="group inline-flex items-center justify-center gap-2 bg-white text-corporate-blue px-8 py-4 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform"
                >
                  Get Started
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  href="/login"
                  className="inline-flex items-center justify-center gap-2 bg-white/10 backdrop-blur-md text-white px-8 py-4 rounded-xl text-lg font-semibold border-2 border-white/30 hover:bg-white/20 transition-all duration-300 hover:scale-105 transform"
                >
                  Sign In
                </Link>
              </div>
            </div>
          </div>
          
          {/* Wave Divider */}
          <div className="absolute bottom-0 left-0 right-0">
            <svg className="w-full h-20 fill-white" viewBox="0 0 1200 120" preserveAspectRatio="none">
              <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" />
              <path d="M0,0V15.81C13,36.92,27.64,56.86,47.69,72.05,99.41,111.27,165,111,224.58,91.58c31.15-10.15,60.09-26.07,89.67-39.8,40.92-19,84.73-46,130.83-49.67,36.26-2.85,70.9,9.42,98.6,31.56,31.77,25.39,62.32,62,103.63,73,40.44,10.79,81.35-6.69,119.13-24.28s75.16-39,116.92-43.05c59.73-5.85,113.28,22.88,168.9,38.84,30.2,8.66,59,6.17,87.09-7.5,22.43-10.89,48-26.93,60.65-49.24V0Z" opacity=".5" />
              <path d="M0,0V5.63C149.93,59,314.09,71.32,475.83,42.57c43-7.64,84.23-20.12,127.61-26.46,59-8.63,112.48,12.24,165.56,35.4C827.93,77.22,886,95.24,951.2,90c86.53-7,172.46-45.71,248.8-84.81V0Z" />
            </svg>
          </div>
        </div>

        {/* Features Section */}
        <div className="py-24 bg-gradient-to-b from-white to-gray-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
                Game Features
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                Everything you need to build and manage your corporate empire
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature Card 1 */}
              <div className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-corporate-blue/50 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100 to-blue-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-corporate-blue to-blue-600 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Clock className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Hourly Turn-Based
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Make strategic decisions every hour. Plan your moves carefully as time ticks away.
                  </p>
                </div>
              </div>

              {/* Feature Card 2 */}
              <div className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-corporate-blue/50 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-100 to-indigo-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Building2 className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Build Your Empire
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Construct production, retail, and service units to expand your business operations.
                  </p>
                </div>
              </div>

              {/* Feature Card 3 */}
              <div className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-corporate-blue/50 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-purple-100 to-purple-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Target className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Strategic Choices
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Choose between vertical or horizontal integration. Customize labor policies and sector focus.
                  </p>
                </div>
              </div>

              {/* Feature Card 4 */}
              <div className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-corporate-blue/50 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-green-100 to-green-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-green-500 to-green-600 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Users className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Multiplayer Competition
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Compete with other players in strategic corporate battles.
                  </p>
                </div>
              </div>

              {/* Feature Card 5 */}
              <div className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-corporate-blue/50 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-orange-100 to-orange-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <TrendingUp className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Integration Strategies
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Master vertical or horizontal integration to optimize your supply chain and market position.
                  </p>
                </div>
              </div>

              {/* Feature Card 6 */}
              <div className="group relative bg-white p-8 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 border border-gray-100 hover:border-corporate-blue/50 hover:-translate-y-2">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-red-100 to-red-50 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-red-500 to-red-600 rounded-xl mb-6 group-hover:scale-110 transition-transform duration-300 shadow-lg">
                    <Settings className="w-7 h-7 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">
                    Labor & Sector Focus
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    Develop custom labor policies and specialize in sectors that match your strategy.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Image Showcase Section */}
        <div className="py-24 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h2 className="text-4xl md:text-5xl font-bold text-gray-900">
                  Strategic Business Management
                </h2>
                <p className="text-xl text-gray-600 leading-relaxed">
                  Take control of your corporate empire with intuitive tools and strategic decision-making. 
                  Every choice matters in building your business success.
                </p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-corporate-blue rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <span className="text-gray-700">Real-time business analytics</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-corporate-blue rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <span className="text-gray-700">Strategic resource management</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 bg-corporate-blue rounded-full flex items-center justify-center mt-0.5">
                      <div className="w-2 h-2 bg-white rounded-full" />
                    </div>
                    <span className="text-gray-700">Competitive multiplayer gameplay</span>
                  </li>
                </ul>
              </div>
              <div className="relative rounded-2xl overflow-hidden shadow-2xl group">
                <div className="aspect-[4/3] relative">
                  <img 
                    src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?ixlib=rb-4.0.3&auto=format&fit=crop&w=2015&q=80"
                    alt="Business strategy"
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="relative py-24 overflow-hidden">
          {/* Background Image */}
          <div 
            className="absolute inset-0 bg-cover bg-center"
            style={{
              backgroundImage: 'url(https://images.unsplash.com/photo-1552664730-d307ca884978?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80)'
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-corporate-blue/95 via-blue-700/95 to-indigo-800/95" />
          
          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              Ready to Build Your Empire?
            </h2>
            <p className="text-xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Start your journey in corporate simulation and compete with other players.
            </p>
            <Link
              href="/register"
              className="group inline-flex items-center gap-3 bg-white text-corporate-blue px-10 py-5 rounded-xl text-lg font-semibold hover:bg-blue-50 transition-all duration-300 shadow-2xl hover:shadow-blue-500/50 hover:scale-105 transform"
            >
              Start Playing Now
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}

