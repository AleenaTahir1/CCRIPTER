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
  Heading,
  useColorModeValue,
  Alert,
  AlertIcon,
  HStack,
  Circle,
  InputGroup,
  InputLeftElement,
  Icon,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext'; // Added useAuth
import ThemeToggle from '../common/ThemeToggle';
import NeuralLogo from '../common/NeuralLogo';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

const ForgotPasswordPage: React.FC = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { forgotPassword } = useAuth(); // Added forgotPassword from context
  
  // Match login page colors exactly
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(31, 41, 55, 0.95)');
  const textColor = useColorModeValue('gray.900', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const inputBg = useColorModeValue('white', 'gray.700');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      // Using authAPI instead of direct fetch
      await forgotPassword(email);
      
      // Navigate to reset password page with step=code parameter
      navigate(`/reset-password?email=${encodeURIComponent(email)}&step=code`);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box 
      minH="100vh" 
      bg={bgColor}
      position="relative"
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
            bg={cardBg}
            p={{ base: 8, md: 12 }}
            borderRadius="2xl"
            boxShadow="2xl"
            border="1px solid"
            borderColor={borderColor}
            backdropFilter="blur(10px)"
            position="relative"
            overflow="hidden"
            initial={{ scale: 0.95 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            {/* Glass effect overlay */}
            <Box
              position="absolute"
              top={0}
              left={0}
              right={0}
              bottom={0}
              bgGradient="linear(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)"
              borderRadius="2xl"
              pointerEvents="none"
            />

            <MotionVStack
              spacing={8}
              position="relative"
              zIndex={1}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
            >
              {/* Logo and Header - matching login page exactly */}
              <VStack spacing={6}>
                <MotionBox
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    duration: 0.6,
                    delay: 0.3,
                    type: "spring",
                    stiffness: 200
                  }}
                >
                  <NeuralLogo size={56} />
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
                      Reset Password
                    </Heading>
                    <Badge 
                      colorScheme="brand" 
                      size="sm" 
                      rounded="full"
                      px={2}
                      fontSize="xs"
                      fontWeight="semibold"
                    >
                      Step 1
                    </Badge>
                  </HStack>
                  <Text 
                    color={subtleColor} 
                    textAlign="center" 
                    fontSize="md"
                    fontWeight="medium"
                  >
                    Enter your email to receive a reset code
                  </Text>
                </VStack>
              </VStack>

              {/* Step Indicator */}
              <HStack spacing={4} justify="center">
                <Circle size="40px" bg="brand.500" color="white" fontWeight="bold" fontSize="sm">
                  1
                </Circle>
                <Circle size="40px" bg={borderColor} color={subtleColor} fontWeight="bold" fontSize="sm">
                  2
                </Circle>
                <Circle size="40px" bg={borderColor} color={subtleColor} fontWeight="bold" fontSize="sm">
                  3
                </Circle>
              </HStack>

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

              {/* Form - matching login page style */}
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
                        placeholder="Enter your email address"
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
                      loadingText="Sending Code..."
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
                      Send Reset Code
                    </Button>
                  </MotionBox>
                </VStack>
              </Box>

              {/* Footer - matching login page */}
              <VStack spacing={4} pt={4} w="full">
                <Divider borderColor={borderColor} />
                
                <VStack spacing={3}>
                  <Link 
                    as={RouterLink} 
                    to="/login" 
                    color="brand.500"
                    fontWeight="medium"
                    display="flex"
                    alignItems="center"
                    gap={2}
                    _hover={{
                      color: 'brand.600',
                      textDecoration: 'none',
                      transform: 'translateY(-1px)',
                    }}
                    transition="all 0.2s"
                  >
                    <Icon as={FiArrowLeft} />
                    Back to Sign In
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

export default ForgotPasswordPage;