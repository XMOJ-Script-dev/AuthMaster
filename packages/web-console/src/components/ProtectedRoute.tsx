import { ReactNode, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import { AccountRole } from '@authmaster/shared';
import { isPasskeyTrusted } from '../utils/passkey';

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AccountRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [checkingPasskey, setCheckingPasskey] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifyPasskey = async () => {
      if (!isAuthenticated) {
        setCheckingPasskey(false);
        return;
      }

      if (!user?.id || isPasskeyTrusted(user.id) || location.pathname === '/passkey-verification') {
        setCheckingPasskey(false);
        return;
      }

      try {
        const mfaStatus = await api.getMFAStatus();
        if (!cancelled && (mfaStatus.passkey_count > 0 || mfaStatus.totp_enabled)) {
          navigate(`/passkey-verification?mode=login&next=${encodeURIComponent(location.pathname + location.search)}`, { replace: true });
          return;
        }
      } finally {
        if (!cancelled) {
          setCheckingPasskey(false);
        }
      }
    };

    verifyPasskey();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, location.pathname, location.search, navigate, user?.id]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (checkingPasskey) {
    return <div className="min-h-screen bg-gray-50" />;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
