import { useState } from 'react';
import { useTranslation } from 'react-i18next';

interface CodeBlockProps {
  code: string;
  inline?: boolean;
}

export function CodeBlock({ code, inline = false }: CodeBlockProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(code.trim());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative group rounded-gh border border-gh-border bg-[#f6f8fa] overflow-hidden">
      {/* Copy button */}
      <button
        onClick={handleCopy}
        title={copied ? t('common.copied') : t('common.copy')}
        className={`
          absolute top-2 right-2 z-10 flex items-center gap-1.5 rounded-gh border px-2 py-1 text-xs font-medium
          transition-all duration-150 shadow-gh-sm
          ${copied
            ? 'border-gh-btn-primary-border bg-gh-btn-primary text-white'
            : 'border-gh-border bg-white text-gh-fg-muted opacity-0 group-hover:opacity-100 hover:text-gh-fg hover:bg-gray-50'
          }
        `}
      >
        {copied ? (
          <>
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
            </svg>
            {t('common.copied')}
          </>
        ) : (
          <>
            <svg className="h-3.5 w-3.5" viewBox="0 0 16 16" fill="currentColor">
              <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
              <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
            </svg>
            {t('common.copy')}
          </>
        )}
      </button>

      {inline ? (
        <code className="block px-4 py-3 pr-20 text-sm text-gh-fg font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
          {code}
        </code>
      ) : (
        <pre className="px-4 py-3 pr-20 text-sm text-gh-fg font-mono leading-relaxed overflow-x-auto">
          <code>{code.trim()}</code>
        </pre>
      )}
    </div>
  );
}
