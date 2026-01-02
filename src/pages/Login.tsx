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
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-30" aria-hidden="true">
        <div className="absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 blur-3xl" />
        <div className="absolute bottom-0 right-[-10%] h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 blur-3xl" />
      </div>

      <div className="relative z-10 mx-auto flex max-w-6xl flex-col items-stretch gap-8 px-4 py-16 sm:px-6 lg:flex-row lg:items-center">
        <div className="flex-1 p-10">
          <div className="mb-6 space-y-1">
            <p className="text-sm font-semibold text-white/70">Sign in</p>
            <h2 className="text-2xl font-semibold text-white">MUCAJEY Admin Portal</h2>
          </div>

          <form className="space-y-6" onSubmit={submit}>
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-semibold text-white/80">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/70 focus:outline-none"
                autoComplete="username"
                placeholder="user@example.com"
                required
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-semibold text-white/80">
                Password
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder:text-white/40 focus:border-white/70 focus:outline-none"
                autoComplete="current-password"
                required
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-200">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || submitting}
              className="w-full rounded-xl bg-gradient-to-r from-indigo-500 to-fuchsia-500 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-500/40 transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading || submitting ? 'Signing in…' : 'Sign in'}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-white/50">
            Need help logging in? Reach out via chat or manage credentials under admin config portal.
          </p>
        </div>

        <div className="flex-1 p-10">
          <p className="text-sm uppercase tracking-[0.3em] text-white/70">Mucajey Admin</p>
          <h1 className="mt-6 text-3xl font-semibold leading-tight text-white sm:text-4xl">
            Sign in to manage cards, editions, and metadata mappings.
          </h1>
          <p className="mt-4 text-base text-white/70">
            Securely maintain Apple Music + Spotify metadata, enrich editions, and keep the production catalog synchronized for all supported regions.
          </p>
          <div className="mt-8 space-y-4 text-sm text-white/70">
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-emerald-400" />
              Live edition sync with curated metadata assignments.
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-fuchsia-400" />
              Apple Music mapping + validation in one place.
            </div>
            <div className="flex items-start gap-3">
              <span className="mt-1 h-2 w-2 rounded-full bg-sky-400" />
              Built for internal tooling with strong credential controls.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
