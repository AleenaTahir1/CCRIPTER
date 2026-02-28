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
  useColorModeValue,
  Alert,
  AlertIcon,
  HStack,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Icon,
} from '@chakra-ui/react';
import { FiMail, FiLock, FiEye, FiEyeOff, FiArrowRight } from 'react-icons/fi';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import ThemeToggle from '../common/ThemeToggle';
import NeuralLogo from '../common/NeuralLogo';

const MotionBox = motion(Box);

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const { login } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();

  const cardBg = useColorModeValue('rgba(255,255,255,0.8)', 'rgba(15, 15, 18, 0.7)');
  const cardBorder = useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)');
  const textColor = useColorModeValue('surface.900', 'surface.100');
  const subtleColor = useColorModeValue('surface.500', 'surface.400');
  const inputBg = useColorModeValue('white', 'rgba(255,255,255,0.04)');
  const inputBorder = useColorModeValue('surface.200', 'rgba(255,255,255,0.08)');
  const errorBg = useColorModeValue('red.50', 'rgba(239,68,68,0.1)');
  const errorBorder = useColorModeValue('red.200', 'rgba(239,68,68,0.2)');
  const placeholderColor = useColorModeValue('surface.400', 'surface.600');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      toast({ title: 'Welcome back', status: 'success', duration: 2000 });
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
      display="flex"
      alignItems="center"
      justifyContent="center"
      position="relative"
      overflow="hidden"
      className="mesh-gradient-auth"
    >
      <ThemeToggle />

      {/* Decorative elements */}
      <Box
        position="absolute"
        top="-20%"
        right="-10%"
        w="500px"
        h="500px"
        borderRadius="full"
        bg="brand.500"
        opacity={0.03}
        filter="blur(120px)"
        pointerEvents="none"
      />
      <Box
        position="absolute"
        bottom="-20%"
        left="-10%"
        w="400px"
        h="400px"
        borderRadius="full"
        bg="accent.500"
        opacity={0.04}
        filter="blur(100px)"
        pointerEvents="none"
      />

      <Container maxW="440px" py={8} position="relative" zIndex={1}>
        <MotionBox
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        >
          <VStack spacing={10} align="stretch">
            {/* Brand Header */}
            <VStack spacing={5} align="center">
              <MotionBox
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <NeuralLogo size={56} />
              </MotionBox>

              <VStack spacing={1}>
                <Text
                  fontFamily="heading"
                  fontWeight="800"
                  fontSize="2xl"
                  letterSpacing="-0.03em"
                  className="gradient-text"
                >
                  Welcome back
                </Text>
                <Text color={subtleColor} fontSize="sm" fontWeight="400">
                  Sign in to continue to CCRIPTER
                </Text>
              </VStack>
            </VStack>

            {/* Card */}
            <Box
              bg={cardBg}
              backdropFilter="blur(24px) saturate(1.2)"
              p={{ base: 7, md: 9 }}
              rounded="2xl"
              border="1px solid"
              borderColor={cardBorder}
              shadow="0 8px 40px rgba(0,0,0,0.12)"
            >
              <VStack spacing={7}>
                {error && (
                  <MotionBox
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    w="full"
                  >
                    <Alert
                      status="error"
                      rounded="xl"
                      bg={errorBg}
                      border="1px solid"
                      borderColor={errorBorder}
                      fontSize="sm"
                    >
                      <AlertIcon />
                      {error}
                    </Alert>
                  </MotionBox>
                )}

                <Box as="form" onSubmit={handleSubmit} w="full">
                  <VStack spacing={5}>
                    <FormControl isRequired>
                      <FormLabel color={textColor} fontWeight="600" fontSize="sm" mb={2}>
                        Email
                      </FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" color={subtleColor} h="full">
                          <Icon as={FiMail} />
                        </InputLeftElement>
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@example.com"
                          bg={inputBg}
                          border="1.5px solid"
                          borderColor={inputBorder}
                          rounded="xl"
                          size="lg"
                          pl={10}
                          fontSize="sm"
                          _hover={{ borderColor: 'brand.400' }}
                          _focus={{
                            borderColor: 'brand.500',
                            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500), 0 0 20px rgba(245,158,11,0.1)',
                          }}
                          _placeholder={{ color: placeholderColor }}
                          transition="all 0.2s"
                        />
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel color={textColor} fontWeight="600" fontSize="sm" mb={2}>
                        Password
                      </FormLabel>
                      <InputGroup>
                        <InputLeftElement pointerEvents="none" color={subtleColor} h="full">
                          <Icon as={FiLock} />
                        </InputLeftElement>
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          bg={inputBg}
                          border="1.5px solid"
                          borderColor={inputBorder}
                          rounded="xl"
                          size="lg"
                          pl={10}
                          pr={10}
                          fontSize="sm"
                          _hover={{ borderColor: 'brand.400' }}
                          _focus={{
                            borderColor: 'brand.500',
                            boxShadow: '0 0 0 1px var(--chakra-colors-brand-500), 0 0 20px rgba(245,158,11,0.1)',
                          }}
                          _placeholder={{ color: placeholderColor }}
                          transition="all 0.2s"
                        />
                        <InputRightElement
                          cursor="pointer"
                          color={subtleColor}
                          h="full"
                          _hover={{ color: 'brand.500' }}
                          onClick={() => setShowPassword(!showPassword)}
                        >
                          <Icon as={showPassword ? FiEyeOff : FiEye} />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <Box w="full" textAlign="right">
                      <Link
                        as={RouterLink}
                        to="/forgot-password"
                        color="brand.500"
                        fontSize="sm"
                        fontWeight="500"
                        _hover={{ color: 'brand.400', textDecoration: 'none' }}
                      >
                        Forgot password?
                      </Link>
                    </Box>

                    <Button
                      type="submit"
                      w="full"
                      size="lg"
                      bg="brand.500"
                      color="surface.950"
                      isLoading={isLoading}
                      loadingText="Signing in..."
                      fontWeight="700"
                      rounded="xl"
                      rightIcon={<FiArrowRight />}
                      _hover={{
                        bg: 'brand.400',
                        transform: 'translateY(-1px)',
                        shadow: '0 8px 30px rgba(245, 158, 11, 0.3)',
                      }}
                      _active={{ transform: 'translateY(0)', bg: 'brand.600' }}
                      transition="all 0.2s cubic-bezier(0.22, 1, 0.36, 1)"
                    >
                      Sign In
                    </Button>
                  </VStack>
                </Box>
              </VStack>
            </Box>

            {/* Footer */}
            <HStack justify="center" spacing={1}>
              <Text color={subtleColor} fontSize="sm">
                No account?
              </Text>
              <Link
                as={RouterLink}
                to="/signup"
                color="brand.500"
                fontWeight="600"
                fontSize="sm"
                _hover={{ color: 'brand.400', textDecoration: 'none' }}
              >
                Create one
              </Link>
            </HStack>
          </VStack>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default LoginPage;
