import React from 'react';
import {
  IconButton,
  useColorMode,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { FiSun, FiMoon } from 'react-icons/fi';
import { motion } from 'framer-motion';

const MotionIconButton = motion(IconButton);

interface ThemeToggleProps {
  position?: 'absolute' | 'relative';
  top?: string;
  right?: string;
  size?: string;
}

const ThemeToggle: React.FC<ThemeToggleProps> = ({
  position = 'absolute',
  top = '4',
  right = '4',
  size = 'md',
}) => {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const iconColor = useColorModeValue('gray.600', 'gray.300');

  return (
    <Tooltip 
      label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      placement="left"
      hasArrow
    >
      <MotionIconButton
        aria-label="Toggle theme"
        icon={isDark ? <FiSun /> : <FiMoon />}
        onClick={toggleColorMode}
        position={position}
        top={top}
        right={right}
        size={size}
        bg={bgColor}
        color={iconColor}
        border="1px solid"
        borderColor={borderColor}
        borderRadius="xl"
        shadow="md"
        _hover={{
          bg: useColorModeValue('gray.50', 'gray.700'),
          transform: 'scale(1.05)',
        }}
        _active={{
          transform: 'scale(0.95)',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition="all 0.2s"
        zIndex={10}
      />
    </Tooltip>
  );
};

export default ThemeToggle;