import type { FormEvent } from 'react';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { authApi, sessionApi } from '../lib/api';

interface UserRecord {
  username: string;
  type: 'admin' | 'user';
}

function fetchUsers() {
  return sessionApi.get<{ users: UserRecord[] }>('/auth/users').then((response) => response.data.users ?? []);
}

type CreateUserResult = { username: string; type: 'admin' | 'user' };

function createUser(payload: { username: string; password: string; type: 'admin' | 'user' }) {
  return sessionApi.post<CreateUserResult>('/auth/users', payload).then((response) => response.data);
}

export default function Users() {
  const { user } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<'admin' | 'user'>('user');
  const [createMessage, setCreateMessage] = useState<string | null>(null);
  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const { data: users = [], isLoading, refetch } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60,
  });

  const mutation = useMutation<CreateUserResult, unknown, { username: string; password: string; type: 'admin' | 'user' }>({
    mutationFn: createUser,
    onSuccess: (result) => {
      setCreateMessage(`Created ${result.username} (${result.type})`);
      setUsername('');
      setPassword('');
      refetch();
    },
    onError: (error: unknown) => {
      if (error instanceof Error) {
        setCreateMessage(error.message);
      } else {
        setCreateMessage('Failed to create user');
      }
    },
  });

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionStatus(null);
    setCreateMessage(null);
    mutation.mutate({ username: username.trim(), password, type });
  };

  const handleResetPassword = async (target: string) => {
    const rawValue = resetPasswords[target] ?? '';
    const trimmed = rawValue.trim();
    if (!trimmed) {
      setActionStatus({ type: 'error', text: 'Please provide a new password before resetting.' });
      return;
    }

    setActionStatus(null);
    setResettingUser(target);
    try {
      await authApi.resetPassword(target, trimmed);
      setResetPasswords((prev) => ({ ...prev, [target]: '' }));
      setActionStatus({ type: 'success', text: `Password reset for ${target}.` });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to reset password';
      setActionStatus({ type: 'error', text: message });
    } finally {
      setResettingUser(null);
    }
  };

  const handleDeleteUser = async (target: string) => {
    if (target === user?.username) {
      setActionStatus({ type: 'error', text: 'You cannot delete your own account.' });
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`Delete the user "${target}"? This cannot be undone.`);
      if (!confirmed) {
        return;
      }
    }

    setActionStatus(null);
    setDeletingUser(target);
    try {
      await authApi.deleteUser(target);
      setActionStatus({ type: 'success', text: `${target} removed.` });
      await refetch();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete user';
      setActionStatus({ type: 'error', text: message });
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="space-y-8">
      <section className="rounded-lg bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">Manage users</h2>
          <p className="text-sm text-gray-500">Only usernames are shared with the UI.</p>
        </div>
        <div className="mt-4">
          {isLoading ? (
            <p className="text-sm text-gray-500">Loading users…</p>
          ) : (
            <ul className="divide-y divide-gray-100 text-sm text-gray-700">
              {users.map((entry) => (
                <li key={entry.username} className="py-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-900">{entry.username}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        entry.type === 'admin' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {entry.type === 'admin' ? 'Admin' : 'User'}
                    </span>
                  </div>
                  <div className="mt-3 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="password"
                        placeholder="New password"
                        value={resetPasswords[entry.username] ?? ''}
                        onChange={(event) =>
                          setResetPasswords((prev) => ({ ...prev, [entry.username]: event.target.value }))
                        }
                        className="grow rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => void handleResetPassword(entry.username)}
                        disabled={resettingUser === entry.username}
                        className="inline-flex items-center rounded-md bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-50"
                      >
                        {resettingUser === entry.username ? 'Resetting…' : 'Reset password'}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDeleteUser(entry.username)}
                        disabled={deletingUser === entry.username || entry.username === user?.username}
                        className="rounded-md border border-gray-200 px-3 py-1.5 text-sm font-semibold text-red-600 shadow-sm hover:border-red-300 hover:text-red-800 disabled:opacity-50"
                      >
                        {deletingUser === entry.username ? 'Deleting…' : 'Delete'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Resetting the password will update the bcrypt hash stored in <code>data/user/user.json</code>.
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
          {actionStatus && (
            <div
              className={`mt-4 rounded-md px-4 py-2 text-sm ${
                actionStatus.type === 'success'
                  ? 'border border-emerald-100 bg-emerald-50 text-emerald-700'
                  : 'border border-red-100 bg-red-50 text-red-700'
              }`}
            >
              {actionStatus.text}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Create user</h2>
        <p className="text-sm text-gray-500">New credentials are written immediately to data/user/user.json.</p>
        <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700">Username</label>
            <input
              required
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Password</label>
            <input
              required
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Role</label>
            <select
              value={type}
              onChange={(event) => setType(event.target.value as 'admin' | 'user')}
              className="mt-1 w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-indigo-500 focus:outline-none focus:ring-indigo-500"
            >
              <option value="user">User</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {createMessage && <p className="text-sm text-gray-500">{createMessage}</p>}
          <button
            type="submit"
            disabled={mutation.isPending}
            className="inline-flex items-center rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {mutation.isPending ? 'Saving…' : 'Create user'}
          </button>
        </form>
      </section>
    </div>
  );
}
