import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { usePageTitle } from '../utils/usePageTitle';

export function HomePage() {
  const { t } = useTranslation();
  usePageTitle(t('nav.home'));
  return (
    <div className="min-h-screen bg-gh-canvas">
      {/* Hero */}
      <div className="border-b border-gh-border bg-white">
        <div className="mx-auto max-w-screen-xl px-4 py-20 text-center">
          <img src="/favicon.png" alt="AuthMaster" width="64" height="64" className="mx-auto mb-6 rounded-md" />
          <h1 className="text-4xl font-semibold text-gh-fg tracking-tight">
            {t('home.title')}
          </h1>
          <p className="mt-4 text-lg text-gh-fg-muted max-w-xl mx-auto">
            {t('home.subtitle')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link
              to="/register"
              className="rounded-gh border border-gh-btn-primary-border bg-gh-btn-primary px-5 py-2 text-sm font-semibold text-white shadow-gh-sm hover:bg-gh-btn-primary-hover transition-colors"
            >
              {t('home.getStarted')}
            </Link>
            <a
              href="https://github.com/PythonSmall-Q/AuthMaster"
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-gh border border-gh-border bg-white px-5 py-2 text-sm font-semibold text-gh-fg shadow-gh-sm hover:bg-gh-canvas transition-colors flex items-center gap-2"
            >
              <svg height="16" viewBox="0 0 16 16" width="16" fill="currentColor" aria-hidden="true">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38
                  0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15
                  -.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51
                  -1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12
                  0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04
                  2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87
                  3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38
                  A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/>
              </svg>
              {t('home.viewOnGitHub')}
            </a>
          </div>
        </div>
      </div>

      {/* Feature cards */}
      <div className="mx-auto max-w-screen-xl px-4 py-12">
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { icon: '🔐', titleKey: 'home.features.oauth.title', descKey: 'home.features.oauth.description' },
            { icon: '⚡', titleKey: 'home.features.cloudflare.title', descKey: 'home.features.cloudflare.description' },
            { icon: '🔒', titleKey: 'home.features.security.title', descKey: 'home.features.security.description' },
          ].map(({ icon, titleKey, descKey }) => (
            <div key={titleKey} className="rounded-gh border border-gh-border bg-white p-5 shadow-gh-sm">
              <div className="mb-3 text-3xl">{icon}</div>
              <h3 className="mb-1 text-base font-semibold text-gh-fg">{t(titleKey)}</h3>
              <p className="text-sm text-gh-fg-muted">{t(descKey)}</p>
            </div>
          ))}
        </div>

        {/* Feature list */}
        <div className="mt-6 rounded-gh border border-gh-border bg-white p-6 shadow-gh-sm">
          <h2 className="mb-4 text-lg font-semibold text-gh-fg">{t('home.moreFeatures.title')}</h2>
          <ul className="space-y-2.5">
            {['item1', 'item2', 'item3', 'item4', 'item5', 'item6'].map(item => (
              <li key={item} className="flex items-start gap-2 text-sm text-gh-fg-muted">
                <svg className="mt-0.5 h-4 w-4 shrink-0 text-gh-btn-primary" viewBox="0 0 16 16" fill="currentColor">
                  <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
                </svg>
                {t(`home.moreFeatures.${item}`)}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

