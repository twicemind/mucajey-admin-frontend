import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Cards from './pages/Cards';
import CardDetail from './pages/CardDetail';
import Editions from './pages/Editions';
import Users from './pages/Users';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import { AuthProvider, useAuth } from './lib/auth';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});


function Navigation() {
  const { user, logout, loading } = useAuth();
  const isAdmin = user?.type === 'admin';

  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <h1 className="text-xl font-bold text-gray-900">🎵 mucajey Admin</h1>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                to="/"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Dashboard
              </Link>
              <Link
                to="/cards"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Cards
              </Link>
              <Link
                to="/editions"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Editions
              </Link>
              <Link
                to="/password"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                Change password
              </Link>
              {isAdmin && (
                <Link
                  to="/users"
                  className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
                >
                  Users
                </Link>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span>
              {user
                ? `Signed in as ${user.username} (${user.type === 'admin' ? 'Admin' : 'User'})`
                : 'Not signed in'}
            </span>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={loading}
              className="rounded-md border border-gray-200 px-3 py-1 text-sm text-gray-600 shadow-sm hover:border-gray-300 hover:text-gray-900 disabled:opacity-50"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function ProtectedLayout() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/cards" element={<Cards />} />
            <Route path="/cards/:filename/:id" element={<CardDetail />} />
            <Route path="/editions" element={<Editions />} />
            <Route path="/files" element={<Editions />} />
            <Route path="/password" element={<ChangePassword />} />
            <Route
              path="/users"
              element={
                <RequireAdmin>
                  <Users />
                </RequireAdmin>
              }
            />
          </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <ProtectedLayout />
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
