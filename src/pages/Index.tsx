import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChatInterface from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Force redirect to main page if we're on auth route
    if (window.location.pathname === '/auth') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  // Redirect to auth if not authenticated (unless in development mode)
  useEffect(() => {
    const isDevelopment = window.location.hostname.includes('lovable.app');
    if (!loading && !user && !isDevelopment) {
      navigate('/auth', { replace: true });
    }
  }, [user, loading, navigate]);

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Don't render if not authenticated (unless in development mode)
  const isDevelopment = window.location.hostname.includes('lovable.app');
  if (!user && !isDevelopment) {
    return null;
  }

  return <ChatInterface />;
};

export default Index;
