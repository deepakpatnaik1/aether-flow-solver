import React from 'react';

interface PersonaBadgeProps {
  persona: string;
}

export const PersonaBadge: React.FC<PersonaBadgeProps> = ({ persona }) => {
  const getPersonaColor = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return 'hsl(var(--primary))';
      case 'samara':
        return 'hsl(var(--primary))';
      case 'claude':
        return 'hsl(var(--accent))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  return (
    <div 
      className="persona-badge"
      style={{ backgroundColor: getPersonaColor(persona) }}
    >
      {persona}
    </div>
  );
};