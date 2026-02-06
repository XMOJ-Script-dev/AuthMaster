import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

export function DashboardPage() {
  useAuth();
  const { t } = useTranslation();

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('dashboard.title')}</h1>

      <div className="grid md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.stats.totalApps')}</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.stats.apiCalls')}</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-gray-500 text-sm font-medium mb-2">{t('dashboard.stats.activeTokens')}</h3>
          <p className="text-3xl font-bold text-gray-900">0</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{t('dashboard.quickStart.title')}</h2>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              1
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">{t('dashboard.quickStart.step1.title')}</h4>
              <p className="text-gray-600">{t('dashboard.quickStart.step1.description')}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              2
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">{t('dashboard.quickStart.step2.title')}</h4>
              <p className="text-gray-600">{t('dashboard.quickStart.step2.description')}</p>
            </div>
          </div>

          <div className="flex items-start">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
              3
            </div>
            <div className="ml-4">
              <h4 className="font-semibold text-gray-900">{t('dashboard.quickStart.step3.title')}</h4>
              <p className="text-gray-600">{t('dashboard.quickStart.step3.description')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
