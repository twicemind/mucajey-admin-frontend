import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useAuth } from '../lib/auth';
import { authApi, sessionApi } from '../lib/api';

interface UserRecord {
  username: string;
  type: 'admin' | 'user';
}

function fetchUsers() {
  return sessionApi.get<{ users: UserRecord[] }>('/auth/users').then((r) => r.data.users ?? []);
}

type CreateUserResult = { username: string; type: 'admin' | 'user' };

function createUser(payload: { username: string; password: string; type: 'admin' | 'user' }) {
  return sessionApi.post<CreateUserResult>('/auth/users', payload).then((r) => r.data);
}

export default function Users() {
  const { user } = useAuth();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [type, setType] = useState<'admin' | 'user'>('user');

  const [actionStatus, setActionStatus] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [resetPasswords, setResetPasswords] = useState<Record<string, string>>({});
  const [resettingUser, setResettingUser] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<string | null>(null);

  const controlBase =
    'h-12 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white ' +
    'placeholder:text-white/40 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/40 transition';

  const { data: users = [], isLoading, refetch } = useQuery<UserRecord[]>({
    queryKey: ['users'],
    queryFn: fetchUsers,
    staleTime: 1000 * 60,
  });

  const stats = useMemo(() => {
    const total = users.length;
    const admins = users.filter((u) => u.type === 'admin').length;
    const normal = total - admins;
    return { total, admins, normal };
  }, [users]);

  const createMutation = useMutation<CreateUserResult, unknown, { username: string; password: string; type: 'admin' | 'user' }>({
    mutationFn: createUser,
    onSuccess: async () => {
      setActionStatus({ type: 'success', text: 'User wurde erstellt.' });
      setUsername('');
      setPassword('');
      setType('user');
      setShowCreateModal(false);
      await refetch();
    },
    onError: (error: unknown) => {
      const msg = error instanceof Error ? error.message : 'User konnte nicht erstellt werden.';
      setActionStatus({ type: 'error', text: msg });
    },
  });

  const handleCreate = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setActionStatus(null);
    createMutation.mutate({ username: username.trim(), password, type });
  };

  const handleResetPassword = async (target: string) => {
    const trimmed = (resetPasswords[target] ?? '').trim();
    if (!trimmed) {
      setActionStatus({ type: 'error', text: 'Bitte ein neues Passwort eingeben.' });
      return;
    }

    setActionStatus(null);
    setResettingUser(target);
    try {
      await authApi.resetPassword(target, trimmed);
      setResetPasswords((prev) => ({ ...prev, [target]: '' }));
      setActionStatus({ type: 'success', text: `Passwort für ${target} wurde zurückgesetzt.` });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Passwort konnte nicht zurückgesetzt werden.';
      setActionStatus({ type: 'error', text: msg });
    } finally {
      setResettingUser(null);
    }
  };

  const handleDeleteUser = async (target: string) => {
    if (target === user?.username) {
      setActionStatus({ type: 'error', text: 'Du kannst deinen eigenen Account nicht löschen.' });
      return;
    }

    if (typeof window !== 'undefined') {
      const confirmed = window.confirm(`User "${target}" löschen? (nicht rückgängig zu machen)`);
      if (!confirmed) return;
    }

    setActionStatus(null);
    setDeletingUser(target);
    try {
      await authApi.deleteUser(target);
      setActionStatus({ type: 'success', text: `${target} wurde gelöscht.` });
      await refetch();
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'User konnte nicht gelöscht werden.';
      setActionStatus({ type: 'error', text: msg });
    } finally {
      setDeletingUser(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
        <div className="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-5%] h-80 w-80 rounded-full bg-gradient-to-tr from-emerald-500 to-cyan-500 blur-[100px]" />
      </div>

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header (wie Cards) */}
        <header className="mb-12 text-center lg:text-left">
          <p className="text-xs uppercase tracking-[0.45em] text-white/45">Access Control</p>

          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Users Management
              </h1>
              <p className="mt-2 text-base text-white/70">
                Benutzer anlegen, Passwörter zurücksetzen und Accounts entfernen.
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowCreateModal(true)}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-full
                         bg-gradient-to-r from-emerald-500 to-teal-500
                         px-6 text-xs font-semibold uppercase tracking-[0.35em] text-white
                         shadow-xl shadow-emerald-500/30 transition hover:opacity-95"
            >
              <span className="text-white/90">+</span>
              Neuer User
            </button>
          </div>

          {/* KPI Row */}
          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">Users</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">Admins</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.admins}</p>
            </div>
            <div className="rounded-[28px] border border-white/10 bg-white/5 p-5 shadow-xl shadow-black/40">
              <p className="text-[11px] uppercase tracking-[0.4em] text-white/60">Standard</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.normal}</p>
            </div>
          </div>
        </header>

        {/* List */}
        <section className="rounded-[32px] border border-white/10 bg-slate-900/60 shadow-2xl shadow-black/60 backdrop-blur-xl">
          <div className="border-b border-white/10 bg-slate-900/70 px-6 py-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-white/60">Users</p>
                <h2 className="text-2xl font-semibold text-white">Alle Accounts</h2>
              </div>
              <p className="text-xs text-white/60">Nur Usernames werden in der UI angezeigt</p>
            </div>
          </div>

          <div className="p-6">
            {isLoading ? (
              <div className="text-sm text-white/70">Lade Users…</div>
            ) : users.length === 0 ? (
              <div className="text-sm text-white/60">Keine Users gefunden.</div>
            ) : (
              <div className="space-y-4">
                {users.map((u) => {
                  const isSelf = u.username === user?.username;
                  const rolePill =
                    u.type === 'admin'
                      ? 'bg-indigo-500/15 text-indigo-100 border border-indigo-400/30'
                      : 'bg-white/5 text-white/70 border border-white/10';

                  return (
                    <article
                      key={u.username}
                      className="rounded-[28px] border border-white/10 bg-gradient-to-br from-slate-900/70 via-slate-900/50 to-slate-950/70 p-5 shadow-xl shadow-black/60"
                    >
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div className="min-w-0">
                          <div className="flex items-center gap-3">
                            <h3 className="truncate text-lg font-semibold text-white">{u.username}</h3>
                            <span className={`rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] ${rolePill}`}>
                              {u.type}
                            </span>
                            {isSelf && (
                              <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.35em] text-emerald-100">
                                du
                              </span>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-white/50">
                            Reset aktualisiert den bcrypt hash in <code className="text-white/70">data/user/user.json</code>.
                          </p>
                        </div>

                        <div className="flex w-full flex-col gap-3 md:w-[520px]">
                          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                            <input
                              type="password"
                              placeholder="Neues Passwort"
                              value={resetPasswords[u.username] ?? ''}
                              onChange={(e) =>
                                setResetPasswords((prev) => ({ ...prev, [u.username]: e.target.value }))
                              }
                              className={controlBase}
                            />

                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => void handleResetPassword(u.username)}
                                disabled={resettingUser === u.username}
                                className="inline-flex h-12 items-center justify-center rounded-full
                                           bg-gradient-to-r from-emerald-500 to-lime-500
                                           px-5 text-xs font-semibold uppercase tracking-[0.35em] text-white
                                           shadow-lg shadow-emerald-500/25 disabled:opacity-40"
                              >
                                {resettingUser === u.username ? 'Reset…' : 'Reset'}
                              </button>

                              <button
                                type="button"
                                onClick={() => void handleDeleteUser(u.username)}
                                disabled={deletingUser === u.username || isSelf}
                                className="inline-flex h-12 items-center justify-center rounded-full
                                           border border-rose-500/30 bg-rose-500/10
                                           px-5 text-xs font-semibold uppercase tracking-[0.35em] text-rose-100
                                           hover:bg-rose-500/15 disabled:opacity-40"
                              >
                                {deletingUser === u.username ? 'Delete…' : 'Delete'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}

            {actionStatus && (
              <div
                className={`mt-6 rounded-2xl border px-4 py-3 text-xs font-semibold uppercase tracking-[0.35em] ${
                  actionStatus.type === 'success'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-100'
                    : 'border-rose-500/30 bg-rose-500/10 text-rose-100'
                }`}
              >
                {actionStatus.text}
              </div>
            )}
          </div>
        </section>

        {/* Create Modal (wie Editions) */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
            <div className="relative w-full max-w-lg rounded-[32px] border border-white/10 bg-slate-950/90 p-6 shadow-2xl shadow-black/70">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.4em] text-white/60">Neuer User</p>
                  <h3 className="text-2xl font-semibold text-white">Account erstellen</h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80"
                >
                  Schließen
                </button>
              </div>

              <form onSubmit={handleCreate} className="space-y-4">
                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Username
                  <input
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    placeholder="z.B. alice"
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Passwort
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 py-2 text-sm text-white placeholder:text-white/40 focus:border-indigo-400 focus:outline-none"
                    placeholder="••••••••"
                  />
                </label>

                <label className="text-xs font-semibold uppercase tracking-[0.35em] text-white/60">
                  Rolle
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as 'admin' | 'user')}
                    className="mt-2 h-12 w-full rounded-2xl border border-white/10 bg-slate-900/70 px-3 text-sm text-white focus:border-indigo-400 focus:outline-none"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </label>

                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="flex-1 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white/80"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending}
                    className="flex-1 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-white shadow-md shadow-emerald-500/40 disabled:opacity-50"
                  >
                    {createMutation.isPending ? 'Erstelle…' : 'Erstellen'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}