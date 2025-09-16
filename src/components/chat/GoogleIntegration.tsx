import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Mail, FileText, Presentation, CheckCircle, XCircle, ExternalLink } from 'lucide-react';

interface GoogleConnectionStatus {
  isConnected: boolean;
  userEmail?: string;
  scopes?: string[];
}

const GoogleIntegration: React.FC = () => {
  const [connectionStatus, setConnectionStatus] = useState<GoogleConnectionStatus>({ isConnected: false });
  const [isConnecting, setIsConnecting] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      const { data, error } = await supabase
        .from('google_tokens')
        .select('user_email, scope, expires_at')
        .limit(1);

      if (error) {
        console.error('Error checking Google connection:', error);
        return;
      }

      if (data && data.length > 0) {
        const tokenData = data[0];
        const isExpired = new Date(tokenData.expires_at) < new Date();
        
        setConnectionStatus({
          isConnected: !isExpired,
          userEmail: tokenData.user_email,
          scopes: tokenData.scope?.split(' ') || [],
        });
      }
    } catch (error) {
      console.error('Error checking connection status:', error);
    }
  };

  const initiateGoogleAuth = async () => {
    setIsConnecting(true);
    
    try {
      // Get the proper OAuth URL from our edge function
      const { data, error } = await supabase.functions.invoke('google-auth-url');
      
      if (error) {
        throw error;
      }

      console.log('Using Google Client ID:', data.clientId);
      
      // Open popup for OAuth
      const popup = window.open(data.authUrl, 'google-auth', 'width=500,height=600');
      
      // Listen for the auth code
      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          setIsConnecting(false);
          checkConnectionStatus();
        }
      }, 1000);
      
    } catch (error) {
      console.error('OAuth initiation error:', error);
      setIsConnecting(false);
      toast({
        title: "OAuth Error",
        description: error.message || "Failed to initiate Google OAuth. Please check your configuration.",
        variant: "destructive",
      });
    }
  };

  const disconnectGoogle = async () => {
    try {
      await supabase
        .from('google_tokens')
        .delete()
        .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

      setConnectionStatus({ isConnected: false });
      
      toast({
        title: "Google account disconnected",
        description: "Your Google account has been disconnected successfully.",
      });
    } catch (error) {
      console.error('Error disconnecting Google:', error);
      toast({
        title: "Error",
        description: "Failed to disconnect Google account.",
        variant: "destructive",
      });
    }
  };

  const hasScope = (scope: string) => {
    return connectionStatus.scopes?.includes(scope) || false;
  };

  const getServiceStatus = (scope: string) => {
    return hasScope(scope) ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Google Workspace Integration
          {connectionStatus.isConnected && (
            <Badge variant="secondary" className="bg-green-100 text-green-800">
              Connected
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Connect your Google account to enable personas to create emails, documents, and presentations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {connectionStatus.isConnected ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-800">
                <strong>Connected as:</strong> {connectionStatus.userEmail}
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Mail className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Gmail</p>
                  <p className="text-xs text-muted-foreground">Send emails</p>
                </div>
                {getServiceStatus('https://www.googleapis.com/auth/gmail.send')}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <FileText className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Google Docs</p>
                  <p className="text-xs text-muted-foreground">Create documents</p>
                </div>
                {getServiceStatus('https://www.googleapis.com/auth/documents')}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-lg border">
                <Presentation className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Google Slides</p>
                  <p className="text-xs text-muted-foreground">Create presentations</p>
                </div>
                {getServiceStatus('https://www.googleapis.com/auth/presentations')}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={disconnectGoogle}>
                Disconnect
              </Button>
              <Button variant="outline" asChild>
                <a 
                  href="https://drive.google.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Google Drive
                </a>
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800 mb-2">
                <strong>Connect your Google account to enable:</strong>
              </p>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Send emails through Gmail</li>
                <li>• Create and edit Google Docs</li>
                <li>• Generate Google Slides presentations</li>
                <li>• Save files to Google Drive</li>
              </ul>
            </div>

            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <p className="text-sm text-amber-800">
                <strong>Setup Required:</strong> You need to configure your Google OAuth credentials first. 
                Please add your Google Client ID and Secret in the Supabase dashboard.
              </p>
            </div>

            <Button 
              onClick={initiateGoogleAuth} 
              disabled={isConnecting}
              className="w-full"
            >
              {isConnecting ? 'Connecting...' : 'Connect Google Account'}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default GoogleIntegration;