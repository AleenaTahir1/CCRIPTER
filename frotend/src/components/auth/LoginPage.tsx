import React, { useState } from 'react';
import {
  Box,
  Button,
  Container,
  FormControl,
  FormLabel,
  Input,
  VStack,
  Text,
  Link,
  useToast,
  Heading,
  useColorModeValue,
  Alert,
  AlertIcon,
  HStack,
  Badge,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Icon,
  Divider,
} from '@chakra-ui/react';
import { FiMail, FiLock, FiUser, FiEye, FiEyeOff } from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../common/ThemeToggle';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  
  const bgColor = useColorModeValue('glass-bg', 'glass-bg');
  const borderColor = useColorModeValue('glass-border', 'glass-border');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const inputBg = useColorModeValue('white', 'gray.800');
  const gradientBg = useColorModeValue(
    'linear(135deg, brand.50 0%, accent.50 100%)',
    'linear(135deg, gray.900 0%, gray.800 100%)'
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      toast({
        title: 'Login successful',
        status: 'success',
        duration: 3000,
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box
      minH="100vh"
      bgGradient={gradientBg}
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
      _before={{
        content: '""',
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        bgGradient: 'linear(135deg, rgba(249,115,22,0.1) 0%, rgba(14,165,233,0.1) 100%)',
        pointerEvents: 'none',
      }}
    >
      {/* Theme Toggle */}
      <ThemeToggle />
      
      <Container maxW="md" py={12} position="relative" zIndex={1}>
        <MotionBox
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <MotionBox
            bg={bgColor}
            backdropFilter="blur(20px)"
            p={10}
            rounded="3xl"
            shadow="glass"
            border="1px solid"
            borderColor={borderColor}
            position="relative"
            _hover={{ shadow: "glow" }}
            transition="all 0.3s"
            whileHover={{ scale: 1.02 }}
          >
            <MotionVStack 
              spacing={8}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              {/* Modern Header with Branding */}
              <VStack spacing={4}>
                <MotionBox
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                >
                  <Box
                    w={16}
                    h={16}
                    bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                    rounded="2xl"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    shadow="xl"
                    position="relative"
                    className="floating"
                    _before={{
                      content: '""',
                      position: 'absolute',
                      inset: 0,
                      rounded: '2xl',
                      p: '2px',
                      bgGradient: 'linear(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
                      mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                      maskComposite: 'subtract',
                    }}
                  >
                    <Text color="white" fontWeight="black" fontSize="2xl">
                      CC
                    </Text>
                  </Box>
                </MotionBox>
                
                <VStack spacing={2}>
                  <HStack spacing={2} align="center">
                    <Heading 
                      size="lg" 
                      textAlign="center"
                      color={textColor}
                      className="gradient-text"
                      fontWeight="bold"
                    >
                      Welcome Back
                    </Heading>
                    <Badge 
                      colorScheme="brand" 
                      size="sm" 
                      rounded="full"
                      px={2}
                      fontSize="xs"
                      fontWeight="semibold"
                    >
                      AI
                    </Badge>
                  </HStack>
                  <Text 
                    color={subtleColor} 
                    textAlign="center" 
                    fontSize="md"
                    fontWeight="medium"
                  >
                    Sign in to your CCRIPTER account
                  </Text>
                </VStack>
              </VStack>
          
              {/* Error Alert */}
              {error && (
                <MotionBox
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  w="full"
                >
                  <Alert 
                    status="error" 
                    rounded="xl"
                    bg="red.50"
                    border="1px solid"
                    borderColor="red.200"
                    color="red.800"
                  >
                    <AlertIcon color="red.500" />
                    {error}
                  </Alert>
                </MotionBox>
              )}

              {/* Modern Form */}
              <Box as="form" onSubmit={handleSubmit} w="full">
                <VStack spacing={6}>
                  <FormControl isRequired>
                    <FormLabel 
                      color={textColor} 
                      fontWeight="semibold"
                      fontSize="sm"
                      mb={2}
                    >
                      Email Address
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement 
                        pointerEvents="none"
                        color={subtleColor}
                        fontSize="lg"
                      >
                        <Icon as={FiMail} />
                      </InputLeftElement>
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email"
                        bg={inputBg}
                        border="2px solid"
                        borderColor={borderColor}
                        rounded="xl"
                        size="lg"
                        pl={12}
                        _hover={{
                          borderColor: 'brand.300',
                        }}
                        _focus={{
                          borderColor: 'brand.500',
                          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                        }}
                        transition="all 0.2s"
                      />
                    </InputGroup>
                  </FormControl>

                  <FormControl isRequired>
                    <FormLabel 
                      color={textColor} 
                      fontWeight="semibold"
                      fontSize="sm"
                      mb={2}
                    >
                      Password
                    </FormLabel>
                    <InputGroup>
                      <InputLeftElement 
                        pointerEvents="none"
                        color={subtleColor}
                        fontSize="lg"
                      >
                        <Icon as={FiLock} />
                      </InputLeftElement>
                      <Input
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        bg={inputBg}
                        border="2px solid"
                        borderColor={borderColor}
                        rounded="xl"
                        size="lg"
                        pl={12}
                        pr={12}
                        _hover={{
                          borderColor: 'brand.300',
                        }}
                        _focus={{
                          borderColor: 'brand.500',
                          boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)',
                        }}
                        transition="all 0.2s"
                      />
                      <InputRightElement 
                        cursor="pointer"
                        color={subtleColor}
                        fontSize="lg"
                        _hover={{ color: 'brand.500' }}
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        <Icon as={showPassword ? FiEyeOff : FiEye} />
                      </InputRightElement>
                    </InputGroup>
                  </FormControl>

                  <MotionBox
                    w="full"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      colorScheme="brand"
                      size="lg"
                      width="full"
                      isLoading={isLoading}
                      loadingText="Signing in..."
                      bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                      color="white"
                      rounded="xl"
                      fontWeight="semibold"
                      shadow="lg"
                      _hover={{
                        bgGradient: "linear(135deg, brand.600 0%, brand.700 100%)",
                        transform: "translateY(-2px)",
                        shadow: "glow",
                      }}
                      _active={{
                        transform: "translateY(0)",
                      }}
                      transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                    >
                      Sign In
                    </Button>
                  </MotionBox>
                </VStack>
              </Box>

              {/* Modern Footer Links */}
              <VStack spacing={4} pt={4}>
                <Divider borderColor={borderColor} />
                
                <VStack spacing={3}>
                  <Link 
                    as={RouterLink} 
                    to="/forgot-password" 
                    color="brand.500"
                    fontWeight="medium"
                    _hover={{
                      color: 'brand.600',
                      textDecoration: 'none',
                      transform: 'translateY(-1px)',
                    }}
                    transition="all 0.2s"
                  >
                    Forgot your password?
                  </Link>
                  
                  <HStack spacing={2}>
                    <Text color={subtleColor} fontWeight="medium">
                      Don't have an account?
                    </Text>
                    <Link 
                      as={RouterLink} 
                      to="/signup" 
                      color="brand.500"
                      fontWeight="semibold"
                      _hover={{
                        color: 'brand.600',
                        textDecoration: 'none',
                        transform: 'translateY(-1px)',
                      }}
                      transition="all 0.2s"
                    >
                      Sign up
                    </Link>
                  </HStack>
                </VStack>
              </VStack>
            </MotionVStack>
          </MotionBox>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default LoginPage;
