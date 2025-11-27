import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

interface RequireAdminProps {
  children: ReactNode;
}

export default function RequireAdmin({ children }: RequireAdminProps) {
  const { user } = useAuth();

  if (user?.type !== 'admin') {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
