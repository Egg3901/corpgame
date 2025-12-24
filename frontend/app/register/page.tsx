import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthForm from '@/components/AuthForm';
import { Building2, DollarSign, Globe, ArrowRight, Sparkles } from 'lucide-react';

export default function RegisterPage() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] py-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <div className="lg:grid lg:grid-cols-2 lg:gap-16 items-center">
            {/* Left side - Info */}
            <div className="mb-12 lg:mb-0">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-corporate-blue/10 text-corporate-blue rounded-full text-xs font-bold uppercase tracking-wider mb-6">
                <Sparkles className="w-3 h-3" />
                Get Started
              </div>
              <h1 className="text-4xl md:text-5xl font-black text-gray-900 mb-6 leading-tight">
                Found Your <span className="text-corporate-blue">Corporation</span>
              </h1>
              <p className="text-lg text-gray-600 mb-8 leading-relaxed">
                Join the most detailed corporate strategy simulation. Start with $500,000 capital and build your empire across 50 US states.
              </p>
              
              <div className="space-y-4 mb-8">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="w-5 h-5 text-corporate-blue" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">$500,000 Starting Capital</h3>
                    <p className="text-sm text-gray-600">Begin with substantial resources to build your first corporation</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Globe className="w-5 h-5 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">50 US Markets</h3>
                    <p className="text-sm text-gray-600">Expand across all states with unique multipliers and resources</p>
                  </div>
                </div>
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                    <Building2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-bold text-gray-900 mb-1">19 Business Sectors</h3>
                    <p className="text-sm text-gray-600">Choose your focus: Technology, Manufacturing, Finance, and more</p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-600">
                <span>Already have an account?</span>
                <Link 
                  href="/login" 
                  className="font-bold text-corporate-blue hover:text-corporate-blue-dark flex items-center gap-1 group"
                >
                  Sign In
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Right side - Form */}
            <div className="bg-white rounded-2xl border border-gray-200 shadow-xl p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-gray-900 mb-2">Create Account</h2>
                <p className="text-sm text-gray-600">Fill out the form below to begin your corporate journey</p>
              </div>
              <AuthForm mode="register" />
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
