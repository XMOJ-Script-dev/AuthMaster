import { useTranslation } from 'react-i18next';

interface ConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: 'danger' | 'warning' | 'info';
}

export function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  onConfirm,
  onCancel,
  variant = 'danger',
}: ConfirmModalProps) {
  const { t } = useTranslation();
  if (!isOpen) return null;

  const variantStyles = {
    danger: {
      button: 'bg-red-600 hover:bg-red-700 focus-visible:ring-red-500',
      iconWrap: 'bg-red-100 text-red-700',
      icon: 'M6 18L18 6M6 6l12 12',
    },
    warning: {
      button: 'bg-yellow-600 hover:bg-yellow-700 focus-visible:ring-yellow-500',
      iconWrap: 'bg-yellow-100 text-yellow-700',
      icon: 'M12 8v4m0 4h.01',
    },
    info: {
      button: 'bg-blue-600 hover:bg-blue-700 focus-visible:ring-blue-500',
      iconWrap: 'bg-blue-100 text-blue-700',
      icon: 'M13 16h-1v-4h-1m1-4h.01',
    },
  };

  const style = variantStyles[variant];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6" role="dialog" aria-modal="true">
      <div
        className="absolute inset-0 bg-gray-900/55 backdrop-blur-sm transition-opacity"
        onClick={onCancel}
      />

      <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-2xl">
        <div className="border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white px-6 py-5">
          <div className="flex items-start gap-4">
            <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${style.iconWrap}`}>
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d={style.icon} />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
              <p className="mt-1 text-sm leading-6 text-gray-600">{message}</p>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              {cancelText || t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`rounded-md px-4 py-2 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 ${style.button}`}
            >
              {confirmText || t('common.confirm')}
            </button>
        </div>
      </div>
    </div>
  );
}
