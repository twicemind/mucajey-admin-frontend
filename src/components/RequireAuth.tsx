import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface RequireAuthProps {
  children: ReactNode;
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="rounded-md bg-white px-6 py-4 text-center text-sm text-gray-500 shadow">
          Checking your session…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}