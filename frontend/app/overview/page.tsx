'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/Layout';
import { authAPI } from '@/lib/api';

export default function OverviewPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        router.push('/login');
        return;
      }

      try {
        const userData = await authAPI.getMe();
        setUser(userData);
      } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    router.push('/');
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center">
          <div className="text-lg text-gray-600">Loading...</div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-gray-900">Welcome, {user?.username}!</h1>
            <p className="text-gray-600 mt-2">Game Overview</p>
          </div>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
          <h2 className="text-2xl font-semibold text-gray-900 mb-6">Game Mechanics</h2>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-corporate-blue mb-3">
                Hourly Turn-Based Gameplay
              </h3>
              <p className="text-gray-700">
                The game operates on an hourly turn system. Each hour, you'll have the opportunity to make strategic decisions about your corporation. Plan your moves carefully as time progresses, and adapt to market conditions and competitor actions.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-corporate-blue mb-3">
                Unit Types
              </h3>
              <div className="grid md:grid-cols-3 gap-4 mt-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Production Units</h4>
                  <p className="text-sm text-gray-600">
                    Manufacture goods and materials. Essential for creating products to sell or use in your supply chain.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Retail Units</h4>
                  <p className="text-sm text-gray-600">
                    Sell products directly to consumers. Maximize your market reach and revenue streams.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Service Units</h4>
                  <p className="text-sm text-gray-600">
                    Provide services to customers or other businesses. High-margin operations with different dynamics.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-corporate-blue mb-3">
                Integration Strategies
              </h3>
              <div className="grid md:grid-cols-2 gap-4 mt-3">
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Vertical Integration</h4>
                  <p className="text-sm text-gray-600">
                    Control your entire supply chain from raw materials to final sale. Reduce costs and dependencies but requires more capital and management.
                  </p>
                </div>
                <div className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-semibold text-gray-900 mb-2">Horizontal Integration</h4>
                  <p className="text-sm text-gray-600">
                    Expand within the same level of the supply chain. Increase market share and economies of scale in your current operations.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-corporate-blue mb-3">
                Labor Policy Focus
              </h3>
              <p className="text-gray-700">
                Customize your labor policies to balance costs, productivity, and employee satisfaction. Different strategies will affect your operational efficiency, reputation, and long-term sustainability.
              </p>
            </div>

            <div>
              <h3 className="text-xl font-semibold text-corporate-blue mb-3">
                Sector Focus
              </h3>
              <p className="text-gray-700">
                Choose to specialize in specific business sectors such as technology, manufacturing, retail, finance, or services. Each sector has unique characteristics, opportunities, and challenges that will shape your corporate strategy.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Coming Soon</h3>
          <p className="text-gray-700">
            The full game dashboard and gameplay features are currently under development. Check back soon to start building your corporate empire!
          </p>
        </div>
      </div>
    </Layout>
  );
}


