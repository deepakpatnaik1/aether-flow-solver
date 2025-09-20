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

  const getPersonaClass = (persona: string) => {
    switch (persona.toLowerCase()) {
      case 'boss':
        return 'persona-badge persona-badge-boss';
      case 'gunnar':
        return 'persona-badge persona-badge-gunnar';
      case 'samara':
        return 'persona-badge persona-badge-samara';
      case 'kirby':
        return 'persona-badge persona-badge-kirby';
      case 'stefan':
        return 'persona-badge persona-badge-stefan';
      default:
        return 'persona-badge';
    }
  };

  return (
    <div className={getPersonaClass(persona)}>
      {getPersonaName(persona)}
    </div>
  );
};