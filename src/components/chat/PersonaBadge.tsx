import React from 'react';
interface PersonaBadgeProps {
  persona: string;
}
export const PersonaBadge: React.FC<PersonaBadgeProps> = ({ persona }) => {
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

  const getPersonaStyle = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return { backgroundColor: '#eab308', color: 'white' }; // Yellow
      case 'gunnar':
        return { backgroundColor: '#1e40af', color: 'white' }; // Blue
      case 'samara':
        return { backgroundColor: '#7c2d92', color: 'white' }; // Magenta
      case 'kirby':
        return { backgroundColor: '#d97706', color: 'white' }; // Orange
      case 'stefan':
        return { backgroundColor: '#059669', color: 'white' }; // Green
      default:
        return { backgroundColor: '#4f46e5', color: 'white' }; // Default primary
    }
  };

  return (
    <div 
      className="persona-badge" 
      style={getPersonaStyle(persona)}
    >
      {getPersonaName(persona)}
    </div>
  );
};