import React, { useState, useRef, useCallback, KeyboardEvent, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { UrlPill } from './UrlPill';
import { detectUrls, reconstructMessage, ParsedUrl, URL_REGEX, fetchUrlContent } from '@/utils/urlUtils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RichMessageInputProps {
  value: string;
  onChange: (value: string) => void;
  onKeyDown: (e: KeyboardEvent<HTMLInputElement>) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

const handleGoogleSlidesOAuth = async () => {
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

export const RichMessageInput = forwardRef<HTMLInputElement, RichMessageInputProps>(({
  value,
  onChange,
  onKeyDown,
  placeholder = "Type a message...",
  disabled = false,
  className = ""
}, ref) => {
  const [urlPills, setUrlPills] = useState<ParsedUrl[]>([]);
  const [displayText, setDisplayText] = useState(value);

  const processUrls = useCallback(async (text: string) => {
    const { urls, cleanText } = detectUrls(text);
    
    if (urls.length > 0) {
      // Add new URL pills (starting in loading state) 
      setUrlPills(prev => [...prev, ...urls]);
      
      // Set clean text in display (URLs are now condensed into pills)
      setDisplayText(cleanText);
      
      // Start fetching content for new URLs
      urls.forEach(async (url) => {
        try {
          const result = await fetchUrlContent(url.url);
          
          // Handle special case: Google authentication required
          if (result.error === 'Google authentication required') {
            setUrlPills(prev => prev.map(pill => 
              pill.id === url.id 
                ? { 
                    ...pill, 
                    error: result.error, 
                    isLoading: false,
                    requiresAuth: true // Special flag for auth needed
                  }
                : pill
            ));
            
            toast.error('Google authentication required for accessing slides');
            return;
          }
          
          // Update the specific URL pill with content or error
          setUrlPills(prev => prev.map(pill => 
            pill.id === url.id 
              ? { 
                  ...pill, 
                  content: result.content, 
                  error: result.error, 
                  isLoading: false 
                }
              : pill
          ));
          
          // Update parent with new content
          setTimeout(() => {
            setUrlPills(currentPills => {
              const fullMessage = reconstructMessage(cleanText, currentPills);
              onChange(fullMessage);
              return currentPills;
            });
          }, 0);
          
        } catch (error) {
          console.error('Error fetching URL content:', error);
          setUrlPills(prev => prev.map(pill => 
            pill.id === url.id 
              ? { 
                  ...pill, 
                  error: 'Failed to fetch content', 
                  isLoading: false 
                }
              : pill
          ));
        }
      });
      
    } else {
      setDisplayText(text);
      // Reconstruct message with existing pills
      const fullMessage = reconstructMessage(text, urlPills);
      onChange(fullMessage);
    }
  }, [urlPills, onChange]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    
    // Check if this input contains URLs
    if (URL_REGEX.test(newValue)) {
      // Process URLs immediately - this will handle setting displayText to clean version
      processUrls(newValue);
    } else {
      setDisplayText(newValue);
      // Still reconstruct message for parent component
      const fullMessage = reconstructMessage(newValue, urlPills);
      onChange(fullMessage);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    
    const pastedText = e.clipboardData.getData('text');
    const currentValue = displayText;
    const input = (ref as React.RefObject<HTMLInputElement>)?.current;
    const cursorPos = input?.selectionStart || currentValue.length;
    
    // Insert pasted text at cursor position
    const newValue = currentValue.slice(0, cursorPos) + pastedText + currentValue.slice(cursorPos);
    
    // Process URLs in the new text
    processUrls(newValue);
  };

  const handleKeyDownInternal = (e: KeyboardEvent<HTMLInputElement>) => {
    // Process URLs when user presses space or enter
    if (e.key === ' ' || e.key === 'Enter') {
      const currentValue = (e.target as HTMLInputElement).value;
      if (URL_REGEX.test(currentValue)) {
        processUrls(currentValue);
      }
    }
    
    // Pass through to parent handler
    onKeyDown(e);
  };

  const removeUrlPill = (urlId: string) => {
    setUrlPills(prev => {
      const updated = prev.filter(pill => pill.id !== urlId);
      // Reconstruct message without the removed URL
      const fullMessage = reconstructMessage(displayText, updated);
      onChange(fullMessage);
      return updated;
    });
  };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* URL Pills Display */}
      {urlPills.length > 0 && (
        <div className="flex flex-wrap items-center gap-1 p-2 bg-muted/30 rounded-md border">
          <span className="text-xs text-muted-foreground mr-2">Links:</span>
          {urlPills.map((url) => (
            <UrlPill
              key={url.id}
              url={url}
              onRemove={removeUrlPill}
            />
          ))}
        </div>
      )}
      
      {/* Text Input */}
      <Input
        ref={ref}
        type="text"
        placeholder={placeholder}
        value={displayText}
        onChange={handleInputChange}
        onKeyDown={handleKeyDownInternal}
        onPaste={handlePaste}
        disabled={disabled}
        className="flex-1"
      />
    </div>
  );
});

RichMessageInput.displayName = 'RichMessageInput';