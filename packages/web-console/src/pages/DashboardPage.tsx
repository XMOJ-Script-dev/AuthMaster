import { useAuth } from '../contexts/AuthContext';

export function DashboardPage() {
  useAuth();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Total Applications</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">API Calls (30d)</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">Active Tokens</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Start</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">Create an Application</h4>
              <p className="text-gray-600">Register your first OAuth application to get started</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">Get API Credentials</h4>
              <p className="text-gray-600">Obtain your App ID and Secret for authentication</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">Integrate with Your App</h4>
              <p className="text-gray-600">Use our OAuth2 endpoints to authenticate users</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
