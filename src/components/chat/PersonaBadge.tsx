import React from 'react';
interface PersonaBadgeProps {
  persona: string;
}
export const PersonaBadge: React.FC<PersonaBadgeProps> = ({ persona }) => {
  const getPersonaColor = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return '#C53030'; 
      case 'gunnar':
        return '#3B4DE8'; 
      case 'samara':
        return '#9333EA'; 
      case 'kirby':
        return '#D97706'; 
      case 'stefan':
        return '#059669'; 
      default:
        return '#6B7280'; 
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
};