import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ChatInterface from "@/components/chat/ChatInterface";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  // Temporarily disabled authentication check for testing
  // const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    // Force redirect to main page if we're on auth route
    if (window.location.pathname === '/auth') {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  return <ChatInterface />;
};

export default Index;
