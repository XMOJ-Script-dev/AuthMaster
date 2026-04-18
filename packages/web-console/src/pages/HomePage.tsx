import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function HomePage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            {t('home.title')}
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            {t('home.subtitle')}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/register"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              {t('home.getStarted')}
            </Link>
            <a
              href="https://github.com/PythonSmall-Q/AuthMaster"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-gray-800 hover:bg-gray-900 text-white px-8 py-3 rounded-lg text-lg font-semibold"
            >
              {t('home.viewOnGitHub')}
            </a>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mb-16">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold mb-2">{t('home.features.oauth.title')}</h3>
            <p className="text-gray-600">
              {t('home.features.oauth.description')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold mb-2">{t('home.features.cloudflare.title')}</h3>
            <p className="text-gray-600">
              {t('home.features.cloudflare.description')}
            </p>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="text-blue-600 text-4xl mb-4">🔒</div>
            <h3 className="text-xl font-semibold mb-2">{t('home.features.security.title')}</h3>
            <p className="text-gray-600">
              {t('home.features.security.description')}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('home.moreFeatures.title')}</h2>
          <ul className="space-y-3 text-gray-700">
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              {t('home.moreFeatures.item1')}
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              {t('home.moreFeatures.item2')}
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              {t('home.moreFeatures.item3')}
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              {t('home.moreFeatures.item4')}
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              {t('home.moreFeatures.item5')}
            </li>
            <li className="flex items-start">
              <span className="text-blue-600 mr-2">✓</span>
              {t('home.moreFeatures.item6')}
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
