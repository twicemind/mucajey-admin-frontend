import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Dashboard from './pages/Dashboard';
import Cards from './pages/Cards';
import CardDetail from './pages/CardDetail';
import Editions from './pages/Editions';
import Users from './pages/Users';
import Login from './pages/Login';
import ChangePassword from './pages/ChangePassword';
import { AuthProvider } from './lib/auth';
import RequireAuth from './components/RequireAuth';
import RequireAdmin from './components/RequireAdmin';
import AppShell from './layout/AppShell';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});


function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              element={
                <RequireAuth>
                  <AppShell />
                </RequireAuth>
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="cards" element={<Cards />} />
              <Route path="cards/:edition_id/:id" element={<CardDetail />} />
              <Route path="editions" element={<Editions />} />
              <Route path="password" element={<ChangePassword />} />
              <Route
                path="users"
                element={
                  <RequireAdmin>
                    <Users />
                  </RequireAdmin>
                }
              />
            </Route>
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;
