import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api, AdminUserListItem } from '../api/client';

export function AdminUsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadUsers = async () => {
    setLoading(true);
    setError('');
    try {
      const result = await api.getAdminUsers({ limit: 100, offset: 0 });
      setUsers(result.users || []);
    } catch (err: any) {
      setError(err.message || t('admin.users.loadFailed'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const toggleStatus = async (user: AdminUserListItem) => {
    try {
      const nextStatus = user.status === 'disabled' ? 'active' : 'disabled';
      const reason = nextStatus === 'disabled' ? (window.prompt(t('admin.users.disableReasonPrompt')) || undefined) : undefined;
      await api.updateAdminUserStatus(user.id, nextStatus, reason);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || t('admin.users.updateFailed'));
    }
  };

  const reviewPendingMerchant = async (user: AdminUserListItem, approve: boolean) => {
    try {
      const reason = !approve ? (window.prompt(t('admin.users.disableReasonPrompt')) || undefined) : undefined;
      await api.updateAdminUserStatus(user.id, approve ? 'active' : 'disabled', reason);
      await loadUsers();
    } catch (err: any) {
      setError(err.message || t('admin.users.updateFailed'));
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('admin.users.title')}</h1>
      <p className="text-gray-600 mb-6">{t('admin.users.subtitle')}</p>

      {error && <div className="mb-4 rounded border border-red-200 bg-red-50 px-4 py-3 text-red-700">{error}</div>}

      {loading ? (
        <p>{t('common.loading')}</p>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">Email</th>
                <th className="px-4 py-3 text-left">Role</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-gray-100">
                  <td className="px-4 py-3">{u.email}</td>
                  <td className="px-4 py-3">{u.role}</td>
                  <td className="px-4 py-3">
                    <span className={u.status === 'active' ? 'text-green-700' : u.status === 'pending' ? 'text-yellow-700' : 'text-red-700'}>{u.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {u.role === 'merchant' && u.status === 'pending' ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => reviewPendingMerchant(u, true)}
                          className="px-3 py-2 rounded bg-green-600 text-white hover:bg-green-700"
                        >
                          {t('admin.users.approveMerchant')}
                        </button>
                        <button
                          onClick={() => reviewPendingMerchant(u, false)}
                          className="px-3 py-2 rounded bg-red-600 text-white hover:bg-red-700"
                        >
                          {t('admin.users.rejectMerchant')}
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => toggleStatus(u)} className="px-3 py-2 rounded bg-orange-600 text-white hover:bg-orange-700">
                        {u.status === 'disabled' ? t('admin.users.enable') : t('admin.users.disable')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
