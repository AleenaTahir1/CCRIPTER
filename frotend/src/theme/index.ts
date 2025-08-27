import { extendTheme, type ThemeConfig } from '@chakra-ui/react';
import { mode } from '@chakra-ui/theme-tools';

const config: ThemeConfig = {
  initialColorMode: 'light',
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  fonts: {
    heading: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
    body: `'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"`,
  },
  colors: {
    brand: {
      50: '#fff7ed',
      100: '#ffedd5',
      200: '#fed7aa',
      300: '#fdba74',
      400: '#fb923c',
      500: '#f97316',
      600: '#ea580c',
      700: '#c2410c',
      800: '#9a3412',
      900: '#7c2d12',
    },
    accent: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    gray: {
      25: '#fcfcfd',
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      850: '#1a202c',
      900: '#111827',
      950: '#0d1117',
    },
  },
  styles: {
    global: (props: any) => ({
      body: {
        bg: mode('gray.25', 'gray.950')(props),
        color: mode('gray.900', 'gray.100')(props),
        fontFeatureSettings: '"cv02", "cv03", "cv04", "cv11"',
        fontVariationSettings: '"opsz" 32',
      },
      '*': {
        borderColor: mode('gray.200', 'gray.700')(props),
      },
      '*, *::before, *::after': {
        borderColor: mode('gray.200', 'gray.700')(props),
      },
    }),
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: '600',
        borderRadius: 'xl',
        _focus: {
          boxShadow: '0 0 0 3px rgba(249, 115, 22, 0.1)',
        },
      },
      variants: {
        ghost: (props: any) => ({
          _hover: {
            bg: mode('gray.100', 'gray.800')(props),
          },
          _active: {
            bg: mode('gray.200', 'gray.700')(props),
          },
        }),
        solid: (props: any) => {
          if (props.colorScheme === 'brand') {
            return {
              bg: 'linear-gradient(135deg, brand.500 0%, brand.600 100%)',
              color: 'white',
              _hover: {
                bg: 'linear-gradient(135deg, brand.600 0%, brand.700 100%)',
                transform: 'translateY(-2px)',
                shadow: 'xl',
              },
              _active: {
                transform: 'translateY(0)',
              },
              transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
            };
          }
        },
      },
    },
    Input: {
      variants: {
        filled: (props: any) => ({
          field: {
            bg: mode('white', 'gray.800')(props),
            border: '1px solid',
            borderColor: mode('gray.200', 'gray.700')(props),
            _hover: {
              bg: mode('gray.50', 'gray.750')(props),
            },
            _focus: {
              bg: mode('white', 'gray.800')(props),
              borderColor: 'brand.500',
              boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
            },
          },
        }),
      },
    },
    Card: {
      baseStyle: (props: any) => ({
        container: {
          bg: mode('rgba(255, 255, 255, 0.8)', 'rgba(31, 41, 55, 0.8)')(props),
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: mode('rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)')(props),
          borderRadius: '2xl',
          shadow: mode(
            '0 25px 50px -12px rgba(0, 0, 0, 0.05)',
            '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
          )(props),
        },
      }),
    },
    Modal: {
      baseStyle: (props: any) => ({
        dialog: {
          bg: mode('rgba(255, 255, 255, 0.95)', 'rgba(31, 41, 55, 0.95)')(props),
          backdropFilter: 'blur(20px)',
          border: '1px solid',
          borderColor: mode('rgba(255, 255, 255, 0.2)', 'rgba(255, 255, 255, 0.1)')(props),
          borderRadius: '2xl',
        },
        overlay: {
          bg: 'blackAlpha.600',
          backdropFilter: 'blur(4px)',
        },
      }),
    },
  },
  semanticTokens: {
    colors: {
      'chakra-body-bg': {
        _light: 'gray.25',
        _dark: 'gray.950',
      },
      'glass-bg': {
        _light: 'rgba(255, 255, 255, 0.8)',
        _dark: 'rgba(31, 41, 55, 0.8)',
      },
      'glass-border': {
        _light: 'rgba(255, 255, 255, 0.2)',
        _dark: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  shadows: {
    glass: '0 25px 50px -12px rgba(0, 0, 0, 0.05)',
    'glass-dark': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
    glow: '0 0 40px rgba(249, 115, 22, 0.15)',
    'glow-lg': '0 0 60px rgba(249, 115, 22, 0.2)',
  },
  space: {
    18: '4.5rem',
    88: '22rem',
    112: '28rem',
    128: '32rem',
  },
});

export default theme;