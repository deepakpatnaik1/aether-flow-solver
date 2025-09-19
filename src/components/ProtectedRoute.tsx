import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  console.log('🛡️ ProtectedRoute rendering...');
  
  const { user, loading } = useAuth();
  console.log('🛡️ ProtectedRoute state:', { user: !!user, loading });

  if (loading) {
    console.log('🛡️ ProtectedRoute: Still loading...');
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('🛡️ ProtectedRoute: No user, redirecting to /auth');
    return <Navigate to="/auth" replace />;
  }

  console.log('🛡️ ProtectedRoute: User found, rendering children');
  return <>{children}</>;
};

export default ProtectedRoute;