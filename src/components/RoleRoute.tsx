import { Navigate } from 'react-router-dom';
import { useAuthContext } from '../context/AuthContext';
import { ReactNode } from 'react';
import { Loader2 } from 'lucide-react';

interface RoleRouteProps {
  children: ReactNode;
  allowedRoles: Array<'Employee' | 'Support Agent' | 'Manager' | 'Admin'>;
}

/** Returns the default home route for a given role. */
export function getRoleHome(role: string): string {
  switch (role) {
    case 'Admin':
      return '/admin';
    case 'Manager':
      return '/manager';
    case 'Support Agent':
      return '/agent';
    default:
      return '/';
  }
}

export default function RoleRoute({ children, allowedRoles }: RoleRouteProps) {
  const { user, isLoading } = useAuthContext();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to={getRoleHome(user.role)} replace />;
  }

  return <>{children}</>;
}
