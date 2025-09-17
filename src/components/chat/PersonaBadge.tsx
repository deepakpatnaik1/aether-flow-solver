import React from 'react';

interface PersonaBadgeProps {
  persona: string;
}

export const PersonaBadge: React.FC<PersonaBadgeProps> = ({ persona }) => {
  // VIBRANT DARK PALETTE UPDATE
  const getPersonaColor = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return 'hsl(var(--persona-boss))';
      case 'gunnar':
        return 'hsl(var(--persona-gunnar))';
      case 'samara':
        return 'hsl(var(--persona-samara))';
      case 'kirby':
        return 'hsl(var(--persona-kirby))';
      case 'stefan':
        return 'hsl(var(--persona-stefan))';
      default:
        return 'hsl(var(--muted))';
    }
  };

  const getPersonaName = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return 'Boss';
      case 'gunnar':
        return 'Gunnar';
      case 'samara':
        return 'Samara';
      case 'kirby':
        return 'Kirby';
      case 'stefan':
        return 'Stefan';
      default:
        return persona;
    }
  };

  return (
    <div 
      className="persona-badge"
      style={{ backgroundColor: getPersonaColor(persona) }}
    >
      {getPersonaName(persona)}
    </div>
  );
  // Force update for new dark palette colors
};