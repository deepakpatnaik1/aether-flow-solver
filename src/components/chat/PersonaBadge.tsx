import React from 'react';

interface PersonaBadgeProps {
  persona: string;
}

export const PersonaBadge: React.FC<PersonaBadgeProps> = ({ persona }) => {
  // DIRECT COLORS - NO CSS VARIABLES
  const getPersonaColor = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return '#C53030'; // VIBRANT DARK RED - DIRECT
      case 'gunnar':
        return '#3B4DE8'; // VIBRANT DARK BLUE - DISTINCT
      case 'samara':
        return '#9333EA'; // ELECTRIC DARK MAGENTA - DISTINCT
      case 'kirby':
        return '#D97706'; // VIBRANT DARK ORANGE - DISTINCT
      case 'stefan':
        return '#059669'; // ELECTRIC DARK GREEN - DISTINCT
      default:
        return '#6B7280'; // FALLBACK GRAY
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