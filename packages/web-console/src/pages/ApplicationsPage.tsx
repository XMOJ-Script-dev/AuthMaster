import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';

export function ApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    redirect_uris: '',
    scopes: 'openid,profile,email',
  });
  const [error, setError] = useState('');
  const [createdApp, setCreatedApp] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  useEffect(() => {
    loadApplications();
  }, []);

  const loadApplications = async () => {
    try {
      const data = await api.getApplications();
      setApplications(data as any[]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await api.createApplication({
        name: formData.name,
        description: formData.description || undefined,
        redirect_uris: formData.redirect_uris.split(',').map(s => s.trim()),
        scopes: formData.scopes.split(',').map(s => s.trim()),
      });
      setCreatedApp(result);
      setShowForm(false);
      setFormData({ name: '', description: '', redirect_uris: '', scopes: 'openid,profile,email' });
      loadApplications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;

    try {
      await api.deleteApplication(deleteConfirm);
      setDeleteConfirm(null);
      loadApplications();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Applications</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"
        >
          {showForm ? 'Cancel' : 'Create Application'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {createdApp && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex justify-between items-start mb-4">
            <h2 className="text-xl font-semibold text-green-900">✓ Application Created Successfully!</h2>
            <button
              onClick={() => setCreatedApp(null)}
              className="text-green-700 hover:text-green-900"
            >
              ✕
            </button>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-200 px-4 py-3 rounded mb-4">
            <p className="text-sm text-yellow-800 font-semibold">
              ⚠️ Save your Client Secret now! You won't be able to see it again.
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client ID
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                  {createdApp.app_id}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdApp.app_id)}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Client Secret
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white px-3 py-2 rounded border text-sm font-mono">
                  {createdApp.app_secret}
                </code>
                <button
                  onClick={() => navigator.clipboard.writeText(createdApp.app_secret)}
                  className="px-3 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Create New Application</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Application Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Redirect URIs (comma-separated)
              </label>
              <input
                type="text"
                value={formData.redirect_uris}
                onChange={(e) => setFormData({ ...formData, redirect_uris: e.target.value })}
                required
                placeholder="https://example.com/callback"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Scopes (comma-separated)
              </label>
              <input
                type="text"
                value={formData.scopes}
                onChange={(e) => setFormData({ ...formData, scopes: e.target.value })}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <button
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-semibold"
            >
              Create Application
            </button>
          </form>
        </div>
      )}

      {applications.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <p className="text-gray-600 mb-4">No applications yet</p>
          <button
            onClick={() => setShowForm(true)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create your first application
          </button>
        </div>
      ) : (
        <div className="grid gap-6">
          {applications.map((app) => (
            <div key={app.id} className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">{app.name}</h3>
                  {app.description && (
                    <p className="text-gray-600 mt-1">{app.description}</p>
                  )}
                </div>
                <div className="flex gap-2">
                  <Link
                    to={`/apps/${app.app_id}`}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm(app.app_id)}
                    className="text-red-600 hover:text-red-700 font-medium"
                  >
                    Delete
                  </button>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">App ID:</span>
                  <code className="ml-2 bg-gray-100 px-2 py-1 rounded">{app.app_id}</code>
                </div>
                <div>
                  <span className="text-gray-500">Created:</span>
                  <span className="ml-2">{new Date(app.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmModal
        isOpen={deleteConfirm !== null}
        title="Delete Application"
        message="Are you sure you want to delete this application? This action cannot be undone and will invalidate all tokens."
        confirmText="Delete"
        cancelText="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(null)}
        variant="danger"
      />
    </div>
  );
}
