// src/components/GenerateButton.tsx

import React from 'react';
import { generateReadingMap } from './generateReadingMap';

const GenerateButton: React.FC = () => {
  const handleClick = () => {
    generateReadingMap().catch(console.error);
  };

  return <button onClick={handleClick}>Generate Reading Map</button>;
};

export default GenerateButton;