import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'dark',
  useSystemColorMode: false,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Cabinet Grotesk', 'Inter', sans-serif`,
    body: `'Inter', sans-serif`,
    mono: `'JetBrains Mono', monospace`,
  },
  colors: {
    brand: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f',
    },
    accent: {
      50: '#ecfeff',
      100: '#cffafe',
      200: '#a5f3fc',
      300: '#67e8f9',
      400: '#22d3ee',
      500: '#06b6d4',
      600: '#0891b2',
      700: '#0e7490',
      800: '#155e75',
      900: '#164e63',
    },
    surface: {
      50: '#fafaf9',
      100: '#f5f5f4',
      200: '#e7e5e4',
      300: '#d6d3d1',
      400: '#a8a29e',
      500: '#78716c',
      600: '#57534e',
      700: '#292524',
      800: '#1c1917',
      850: '#151412',
      900: '#110f0d',
      950: '#0c0a09',
    },
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: mode('surface.50', 'surface.950')(props),
        color: mode('surface.900', 'surface.100')(props),
      },
      '*': {
        borderColor: mode('surface.200', 'surface.800')(props),
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        fontFamily: `'Inter', sans-serif`,
        borderRadius: 'xl',
        letterSpacing: '0.01em',
      },
      variants: {
        ghost: (props: any) => ({
          _hover: {
            bg: mode('surface.100', 'whiteAlpha.100')(props),
          },
          _active: {
            bg: mode('surface.200', 'whiteAlpha.200')(props),
          },
        }),
        solid: (props: any) => {
          if (props.colorScheme === 'brand') {
            return {
              bg: 'brand.500',
              color: 'surface.950',
              fontWeight: '700',
              _hover: {
                bg: 'brand.400',
                transform: 'translateY(-1px)',
                shadow: '0 8px 30px rgba(245, 158, 11, 0.3)',
              },
              _active: {
                transform: 'translateY(0)',
                bg: 'brand.600',
              },
              transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
            };
          }
        },
        glass: (props: any) => ({
          bg: mode('whiteAlpha.800', 'whiteAlpha.100')(props),
          backdropFilter: 'blur(12px)',
          border: '1px solid',
          borderColor: mode('whiteAlpha.400', 'whiteAlpha.100')(props),
          _hover: {
            bg: mode('whiteAlpha.900', 'whiteAlpha.200')(props),
            transform: 'translateY(-1px)',
          },
          _active: {
            transform: 'translateY(0)',
          },
          transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
        }),
      },
    },
    Input: {
      variants: {
        filled: (props: any) => ({
          field: {
            bg: mode('white', 'whiteAlpha.50')(props),
            border: '1.5px solid',
            borderColor: mode('surface.200', 'whiteAlpha.100')(props),
            borderRadius: 'xl',
            _hover: {
              bg: mode('surface.50', 'whiteAlpha.100')(props),
              borderColor: mode('surface.300', 'whiteAlpha.200')(props),
            },
            _focus: {
              bg: mode('white', 'whiteAlpha.100')(props),
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500), 0 0 20px rgba(245, 158, 11, 0.1)',
            },
          },
        }),
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg: mode('rgba(255, 255, 255, 0.7)', 'rgba(24, 24, 27, 0.6)')(props),
          backdropFilter: 'blur(24px) saturate(1.2)',
          border: '1px solid',
          borderColor: mode('rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.06)')(props),
          borderRadius: '2xl',
          shadow: mode(
            '0 8px 32px rgba(0, 0, 0, 0.08)',
            '0 8px 32px rgba(0, 0, 0, 0.4)'
          )(props),
        },
      }),
    },
    Modal: {
      baseStyle: (props: any) => ({
        dialog: {
          bg: mode('rgba(255, 255, 255, 0.95)', 'rgba(15, 15, 18, 0.95)')(props),
          backdropFilter: 'blur(24px)',
          border: '1px solid',
          borderColor: mode('rgba(255, 255, 255, 0.3)', 'rgba(255, 255, 255, 0.06)')(props),
          borderRadius: '2xl',
        },
        overlay: {
          bg: 'blackAlpha.700',
          backdropFilter: 'blur(8px)',
        },
      }),
    },
  },
  semanticTokens: {
    colors: {
      'chakra-body-bg': {
        _light: 'surface.50',
        _dark: 'surface.950',
      },
      'glass-bg': {
        _light: 'rgba(255, 255, 255, 0.7)',
        _dark: 'rgba(24, 24, 27, 0.6)',
      },
      'glass-border': {
        _light: 'rgba(255, 255, 255, 0.3)',
        _dark: 'rgba(255, 255, 255, 0.06)',
      },
      'surface-elevated': {
        _light: 'white',
        _dark: 'surface.900',
      },
    },
  },
  shadows: {
    glass: '0 8px 32px rgba(0, 0, 0, 0.08)',
    'glass-dark': '0 8px 32px rgba(0, 0, 0, 0.4)',
    glow: '0 0 40px rgba(245, 158, 11, 0.15)',
    'glow-lg': '0 0 60px rgba(245, 158, 11, 0.25)',
    'glow-accent': '0 0 40px rgba(6, 182, 212, 0.15)',
    'inner-glow': 'inset 0 1px 0 rgba(255, 255, 255, 0.05)',
  },
  space: {
    18: '4.5rem',
    88: '22rem',
    112: '28rem',
    128: '32rem',
  },
});

export default theme;
