import type { FormEvent } from 'react';
import { useState } from 'react';
import { sessionApi } from '../lib/api';

export default function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!newPassword) {
      setStatus({ type: 'error', text: 'Enter a new password.' });
      return;
    }

    if (newPassword !== confirmPassword) {
      setStatus({ type: 'error', text: 'New password and confirmation do not match.' });
      return;
    }

    setLoading(true);
    setStatus(null);

    try {
      await sessionApi.post('/auth/users/password', { currentPassword, newPassword });
      setStatus({ type: 'success', text: 'Password updated successfully.' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update password';
      setStatus({ type: 'error', text: message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white px-6 py-8 shadow-sm">
      <h2 className="text-xl font-semibold text-gray-900">Change password</h2>
      <p className="mt-1 text-sm text-gray-500">
        Enter your current password and choose a new one to keep your account secure.
      </p>

      <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label className="block text-sm font-medium text-gray-700">Current password</label>
          <input
            type="password"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">New password</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Confirm new password</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        {status && (
          <div
            className={`rounded-md px-4 py-2 text-sm ${
              status.type === 'success'
                ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                : 'border border-red-100 bg-red-50 text-red-700'
            }`}
          >
            {status.text}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
        >
          {loading ? 'Updating…' : 'Update password'}
        </button>
      </form>
    </div>
  );
}
