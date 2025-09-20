import React from 'react';
import { X, Loader2, Check, AlertCircle, Key } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ParsedUrl } from '@/utils/urlUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UrlPillProps {
  url: ParsedUrl;
  onRemove: (id: string) => void;
}

const handleGoogleAuth = async () => {
  try {
    console.log('🔐 Initiating Google OAuth flow...');
    
    const { data, error } = await supabase.functions.invoke('google-oauth-init');
    
    if (error) {
      console.error('OAuth init error:', error);
      toast.error('Failed to initialize Google authentication');
      return;
    }
    
    if (data?.authUrl) {
      console.log('🌐 Redirecting to Google OAuth...');
      window.location.href = data.authUrl;
    }
  } catch (error) {
    console.error('OAuth flow error:', error);
    toast.error('Failed to start Google authentication');
  }
};

export const UrlPill: React.FC<UrlPillProps> = ({ url, onRemove }) => {
  const getStatusIcon = () => {
    if (url.isLoading) {
      return <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />;
    }
    if (url.requiresAuth) {
      return <Key className="h-3 w-3 text-amber-500" />;
    }
    if (url.error) {
      return <AlertCircle className="h-3 w-3 text-destructive" />;
    }
    if (url.content) {
      return <Check className="h-3 w-3 text-green-500" />;
    }
    return null;
  };

  const getStatusText = () => {
    if (url.isLoading) return "Fetching Google Slides content...";
    if (url.requiresAuth) return "Click to authenticate with Google";
    if (url.error) return `Error: ${url.error}`;
    if (url.content) return "Google Slides content loaded";
    return url.displayText;
  };

  const handlePillClick = () => {
    if (url.requiresAuth) {
      handleGoogleAuth();
    }
  };

  return (
    <span 
      className={`inline-flex items-center gap-1 px-2 py-1 mx-1 border rounded-md text-sm max-w-xs ${
        url.requiresAuth 
          ? 'bg-amber-50 border-amber-200 cursor-pointer hover:bg-amber-100' 
          : url.error 
            ? 'bg-destructive/10 border-destructive/20' 
            : url.content 
              ? 'bg-green-50 border-green-200' 
              : 'bg-secondary/50 border-border'
      }`}
      onClick={handlePillClick}
      title={getStatusText()}
    >
      <img 
        src={url.favicon} 
        alt=""
        className="w-4 h-4 flex-shrink-0"
        onError={(e) => {
          // Fallback to a generic icon if favicon fails to load
          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71'%3E%3C/path%3E%3Cpath d='M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'%3E%3C/path%3E%3C/svg%3E";
        }}
      />
      <span className="truncate flex-1 text-foreground/80">
        {url.displayText}
      </span>
      {getStatusIcon()}
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="h-4 w-4 p-0 hover:bg-destructive/20 flex-shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          onRemove(url.id);
        }}
        aria-label={`Remove ${url.domain}`}
      >
        <X className="h-3 w-3" />
      </Button>
    </span>
  );
};