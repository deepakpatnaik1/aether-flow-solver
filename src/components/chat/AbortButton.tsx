import React from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AbortButtonProps {
  onAbort: () => void;
  isVisible: boolean;
}

export const AbortButton: React.FC<AbortButtonProps> = ({ onAbort, isVisible }) => {
  if (!isVisible) return null;

  return (
    <Button
      onClick={onAbort}
      variant="outline"
      className="abort-button bg-destructive/10 border-destructive/20 text-destructive hover:bg-destructive/20 hover:border-destructive/30"
    >
      <X className="h-4 w-4 mr-1" />
      Abort
    </Button>
  );
};