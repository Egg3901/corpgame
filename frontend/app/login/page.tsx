import Link from 'next/link';
import Layout from '@/components/Layout';
import AuthForm from '@/components/AuthForm';

export default function LoginPage() {
  return (
    <Layout>
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Sign in to your account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              Or{' '}
              <Link href="/register" className="font-medium text-corporate-blue hover:text-corporate-blue-dark">
                create a new account
              </Link>
            </p>
          </div>
          <div className="bg-white py-8 px-6 shadow rounded-lg">
            <AuthForm mode="login" />
          </div>
        </div>
      </div>
    </Layout>
  );
}




