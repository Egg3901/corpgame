import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthForm from '@/components/AuthForm';
import { Building2, TrendingUp, Users, ArrowRight } from 'lucide-react';

export default function LoginPage() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left side - Info */}
            <div className="mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-corporate-blue/10 text-corporate-blue rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <Building2 className="w-3 h-3" />
                Executive Access
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
                Welcome Back, <span className="text-corporate-blue">Executive</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Access your portfolio, manage your corporations, and continue building your business empire.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-corporate-blue" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Track Your Investments</h3>
                    <p className="text-sm text-gray-600">Monitor portfolio performance and stock prices in real-time</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Users className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">Manage Your Corporation</h3>
                    <p className="text-sm text-gray-600">Build units, enter markets, and lead board decisions</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>New to Corporate Warfare?</span>
                <Link 
                  href="/register" 
                  className="font-bold text-corporate-blue hover:text-corporate-blue-dark flex items-center gap-1 group"
                >
                  Create Account
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Sign In</h2>
                <p className="text-sm text-gray-600">Enter your credentials to access your account</p>
              </div>
              <AuthForm mode="login" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
