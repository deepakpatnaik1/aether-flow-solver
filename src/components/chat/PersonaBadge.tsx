import React from 'react';

interface PersonaBadgeProps {
  persona: string;
}

export const PersonaBadge: React.FC<PersonaBadgeProps> = ({ persona }) => {
  // DIRECT COLORS - NO CSS VARIABLES
  const getPersonaColor = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return '#A66B6B'; // MUTED RED - PROFESSIONAL
      case 'gunnar':
        return '#5A6B7D'; // MUTED BLUE-GRAY - PROFESSIONAL
      case 'samara':
        return '#6E5F70'; // MUTED PURPLE-GRAY - PROFESSIONAL
      case 'kirby':
        return '#8A7558'; // MUTED AMBER - PROFESSIONAL
      case 'stefan':
        return '#4F6661'; // MUTED TEAL-GRAY - PROFESSIONAL
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
      style={{ color: getPersonaColor(persona) }}
    >
      {getPersonaName(persona)}
    </div>
  );
  // Force update for new dark palette colors
};