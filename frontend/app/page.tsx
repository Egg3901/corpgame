import Link from 'next/link';
import Layout from '@/components/Layout';

export default function Home() {
  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Hero Section */}
        <div className="text-center py-20">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Corporate Sim
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Build your corporate empire in this strategic multiplayer simulation game.
            Make critical business decisions every hour and compete with players worldwide.
          </p>
          <div className="flex justify-center space-x-4">
            <Link
              href="/register"
              className="bg-corporate-blue text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-corporate-blue-dark transition"
            >
              Get Started
            </Link>
            <Link
              href="/login"
              className="bg-white text-corporate-blue px-8 py-3 rounded-lg text-lg font-semibold border-2 border-corporate-blue hover:bg-gray-50 transition"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Features Section */}
        <div className="mt-20 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Hourly Turn-Based
            </h3>
            <p className="text-gray-600">
              Make strategic decisions every hour. Plan your moves carefully as time ticks away.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Build Your Empire
            </h3>
            <p className="text-gray-600">
              Construct production, retail, and service units to expand your business operations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Strategic Choices
            </h3>
            <p className="text-gray-600">
              Choose between vertical or horizontal integration. Customize labor policies and sector focus.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Multiplayer Competition
            </h3>
            <p className="text-gray-600">
              Compete with players from around the world in real-time corporate battles.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Integration Strategies
            </h3>
            <p className="text-gray-600">
              Master vertical or horizontal integration to optimize your supply chain and market position.
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Labor & Sector Focus
            </h3>
            <p className="text-gray-600">
              Develop custom labor policies and specialize in sectors that match your strategy.
            </p>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-20 text-center bg-corporate-blue text-white p-12 rounded-lg">
          <h2 className="text-3xl font-bold mb-4">Ready to Build Your Empire?</h2>
          <p className="text-xl mb-6 opacity-90">
            Join thousands of players competing in the ultimate corporate simulation game.
          </p>
          <Link
            href="/register"
            className="inline-block bg-white text-corporate-blue px-8 py-3 rounded-lg text-lg font-semibold hover:bg-gray-100 transition"
          >
            Start Playing Now
          </Link>
        </div>
      </div>
    </Layout>
  );
}

