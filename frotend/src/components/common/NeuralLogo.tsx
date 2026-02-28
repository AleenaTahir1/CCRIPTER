import React from 'react';
import { Box } from '@chakra-ui/react';

interface NeuralLogoProps {
  size?: number;
  ringColor?: string;
  coreColor?: string;
}

const NeuralLogo: React.FC<NeuralLogoProps> = ({
  size = 24,
  ringColor = '#34495E',
  coreColor = '#E67E22',
}) => {
  return (
    <Box as="svg" width={`${size}px`} height={`${size}px`} viewBox="0 0 200 200" fill="none">
      <circle cx="100" cy="100" r="60" stroke={ringColor} strokeWidth="8" fill="none" strokeDasharray="280 100" />
      <circle cx="100" cy="100" r="15" fill={coreColor} />
    </Box>
  );
};

export default NeuralLogo;
