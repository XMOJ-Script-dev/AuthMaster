import { useEffect } from 'react';

const SITE_NAME = 'AuthMaster';

export function usePageTitle(pageTitle?: string) {
  useEffect(() => {
    document.title = pageTitle ? `${pageTitle} · ${SITE_NAME}` : SITE_NAME;
    return () => {
      document.title = SITE_NAME;
    };
  }, [pageTitle]);
}
