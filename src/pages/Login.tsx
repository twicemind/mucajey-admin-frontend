import type { FormEvent } from 'react';
import { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

type LocationState = {
  from?: {
    pathname: string;
  };
};

export default function Login() {
  const { login, user, loading, error } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as LocationState)?.from?.pathname ?? '/';

  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, from, navigate]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login({ username, password });
      navigate(from, { replace: true });
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <div className="w-full max-w-md space-y-8 rounded-xl bg-white px-10 py-12 shadow-lg">
        <div>
          <h2 className="text-center text-3xl font-bold text-gray-900">Admin Login</h2>
          <p className="mt-2 text-center text-sm text-gray-500">Authenticate with credentials stored in data/user/user.json</p>
        </div>
        <form className="space-y-6" onSubmit={submit}>
          <div>
            <label htmlFor="username" className="block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              autoComplete="username"
              placeholder="user@example.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="mt-1 w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-50"
          >
            {loading || submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
