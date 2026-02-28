import React from 'react';
import {
  IconButton,
  useColorMode,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { FiSun, FiMoon } from 'react-icons/fi';

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

  return (
    <Tooltip
      label={`Switch to ${isDark ? 'light' : 'dark'} mode`}
      placement="left"
      hasArrow
    >
      <IconButton
        aria-label="Toggle theme"
        icon={isDark ? <FiSun size={16} /> : <FiMoon size={16} />}
        onClick={toggleColorMode}
        position={position}
        top={top}
        right={right}
        size={size}
        bg={useColorModeValue('white', 'whiteAlpha.100')}
        color={useColorModeValue('surface.600', 'surface.300')}
        border="1px solid"
        borderColor={useColorModeValue('surface.200', 'whiteAlpha.100')}
        borderRadius="xl"
        shadow="sm"
        _hover={{
          bg: useColorModeValue('surface.50', 'whiteAlpha.200'),
          color: 'brand.500',
          transform: 'scale(1.05)',
        }}
        _active={{ transform: 'scale(0.95)' }}
        transition="all 0.2s"
        zIndex={10}
      />
    </Tooltip>
  );
};

export default ThemeToggle;
