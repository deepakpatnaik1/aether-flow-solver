import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Shield, MessageCircle, Key } from 'lucide-react';

const DataRecoveryGuide = () => {
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          Data Protection & Recovery
        </CardTitle>
        <CardDescription>
          Understanding how your chat data is protected and recovered
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-start gap-3">
          <MessageCircle className="h-5 w-5 text-blue-500 mt-1" />
          <div>
            <h3 className="font-semibold text-foreground">Your Messages Are Safe</h3>
            <p className="text-sm text-muted-foreground">
              All your chat messages are stored in an encrypted database with Row Level Security (RLS). 
              This means only you can see your own conversations when authenticated.
            </p>
          </div>
        </div>
        
        <div className="flex items-start gap-3">
          <Key className="h-5 w-5 text-green-500 mt-1" />
          <div>
            <h3 className="font-semibold text-foreground">How to Access Your Data</h3>
            <ul className="text-sm text-muted-foreground space-y-1 mt-1">
              <li>• Log in with your authenticated account</li>
              <li>• Your message history will load automatically</li>
              <li>• Data persists across browser sessions</li>
              <li>• No data is lost when you log out</li>
            </ul>
          </div>
        </div>

        <div className="bg-muted/50 p-4 rounded-lg">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> If you see empty chat history, it usually means you need to authenticate. 
            This is a security feature, not data loss.
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataRecoveryGuide;