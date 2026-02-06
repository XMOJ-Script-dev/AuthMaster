import { Link } from 'react-router-dom';

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Welcome to AuthMaster
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Open-source OAuth2/OIDC authentication server
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              Get Started
            </Link>
            <a
              href="https://github.com/PythonSmall-Q/AuthMaster"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              View on GitHub
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold mb-2">OAuth2/OIDC</h3>
            <p className="text-gray-600">
              Full OAuth2.0 and OpenID Connect support with multiple grant types
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">Cloudflare Powered</h3>
            <p className="text-gray-600">
              Deployed on Cloudflare Workers for global edge performance
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">📊</div>
            <h3 className="text-xl font-semibold mb-2">Analytics</h3>
            <p className="text-gray-600">
              Monitor API usage, traffic, and performance metrics
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Features</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              User registration, login, and password reset
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              Third-party application management
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              OAuth2 authorization code and client credentials flows
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              JWT token generation and validation
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              API usage tracking and analytics
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              PKCE support for enhanced security
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
