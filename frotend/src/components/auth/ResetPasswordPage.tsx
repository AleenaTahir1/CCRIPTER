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
  Alert,
  AlertIcon,
  Heading,
  useColorModeValue,
  Link,
  HStack,
  Circle,
  PinInput,
  PinInputField,
  useToast,
  InputGroup,
  InputLeftElement,
  InputRightElement,
  Icon,
  Badge,
  Divider,
} from '@chakra-ui/react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FaCheck } from 'react-icons/fa';
import { FiMail, FiLock, FiArrowLeft, FiEye, FiEyeOff } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext'; // Added useAuth
import ThemeToggle from '../common/ThemeToggle';
import NeuralLogo from '../common/NeuralLogo';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

interface ResetPasswordPageProps {}

const ResetPasswordPage: React.FC<ResetPasswordPageProps> = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';
  const initialStep = searchParams.get('step') as 'email' | 'code' | 'password' || 'email';
  const toast = useToast();
  
  const { forgotPassword, verifyCode, resetPassword } = useAuth(); // Added auth functions

  // State management
  const [step, setStep] = useState<'email' | 'code' | 'password'>(initialStep);
  const [email, setEmail] = useState(initialEmail);
  const [code, setCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);

  // Match login page colors exactly
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(31, 41, 55, 0.95)');
  const textColor = useColorModeValue('gray.900', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const inputBg = useColorModeValue('white', 'gray.700');

  // Countdown timer effect
  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Step indicator component
  const StepIndicator = ({ currentStep }: { currentStep: 'email' | 'code' | 'password' }) => {
    const steps = [
      { key: 'email', number: 1, label: 'Email' },
      { key: 'code', number: 2, label: 'Verify' },
      { key: 'password', number: 3, label: 'Reset' },
    ];

    return (
      <HStack spacing={4} justify="center" mb={8}>
        {steps.map((step, index) => {
          const isActive = step.key === currentStep;
          const isCompleted = steps.findIndex(s => s.key === currentStep) > index;
          
          return (
            <Circle
              key={step.key}
              size="40px"
              bg={isCompleted ? 'green.500' : isActive ? 'brand.500' : borderColor}
              color={isCompleted || isActive ? 'white' : subtleColor}
              fontWeight="bold"
              fontSize="sm"
            >
              {isCompleted ? <FaCheck /> : step.number}
            </Circle>
          );
        })}
      </HStack>
    );
  };

  // Step 1: Request reset code
  const handleRequestCode = async () => {
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Using authAPI instead of direct fetch
      await forgotPassword(email);
      
      setStep('code');
      setCountdown(38); // Start 38 second countdown
      setSuccess('Reset code sent to your email address');
      toast({
        title: 'Code Sent',
        description: 'Please check your email for the verification code',
        status: 'success',
        duration: 5000,
      });
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code via backend
  const handleVerifyCode = async () => {
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await verifyCode(email, code);
      setStep('password');
      setSuccess('Code verified! Now set your new password');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Invalid or expired verification code');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 3: Reset password
  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      await resetPassword(email, code, newPassword);
      
      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been updated. Redirecting to login...',
        status: 'success',
        duration: 5000,
      });
      setTimeout(() => navigate('/login'), 2000);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box 
      minH="100vh" 
      bg={bgColor}
      position="relative"
      overflow="hidden"
    >
      {/* Theme Toggle */}
      <ThemeToggle />
      {/* Background Elements - matching login page */}
      <MotionBox
        position="absolute"
        top="-10%"
        right="-10%"
        w="300px"
        h="300px"
        borderRadius="full"
        bgGradient="linear(45deg, brand.400, brand.600)"
        opacity={0.1}
        animate={{
          rotate: 360,
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "linear",
        }}
      />
      
      <MotionBox
        position="absolute"
        bottom="-10%"
        left="-10%"
        w="400px"
        h="400px"
        borderRadius="full"
        bgGradient="linear(45deg, purple.400, pink.400)"
        opacity={0.05}
        animate={{
          rotate: -360,
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "linear",
        }}
      />

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
                      {step === 'email' ? 'Step 1' : step === 'code' ? 'Step 2' : 'Step 3'}
                    </Badge>
                  </HStack>
                  <Text 
                    color={subtleColor} 
                    textAlign="center" 
                    fontSize="md"
                    fontWeight="medium"
                  >
                    {step === 'email' ? 'Enter your email to receive a reset code' : 
                     step === 'code' ? 'Enter the verification code from your email' :
                     'Create your new password'}
                  </Text>
                </VStack>
              </VStack>

              {/* Step Indicator */}
              <StepIndicator currentStep={step} />

              {/* Error and Success Messages */}
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

              {success && (
                <MotionBox
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  w="full"
                >
                  <Alert 
                    status="success" 
                    rounded="xl"
                    bg="green.50"
                    border="1px solid"
                    borderColor="green.200"
                    color="green.800"
                  >
                    <AlertIcon color="green.500" />
                    {success}
                  </Alert>
                </MotionBox>
              )}

              {/* Step 1: Email Input */}
              {step === 'email' && (
                <Box as="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleRequestCode(); }} w="full">
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

                    <VStack spacing={3}>
                      <Link 
                        color="brand.500"
                        fontWeight="medium"
                        display="flex"
                        alignItems="center"
                        gap={2}
                        onClick={() => navigate('/login')}
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
                    </VStack>
                  </VStack>
                </Box>
              )}

              {/* Step 2: Code Verification */}
              {step === 'code' && (
                <Box as="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleVerifyCode(); }} w="full">
                  <VStack spacing={6}>
                    <VStack spacing={3} textAlign="center">
                      <Text color={textColor} fontSize="md" fontWeight="medium">
                        A verification code was sent to
                      </Text>
                      <Text color="brand.500" fontWeight="semibold" fontSize="md">
                        {email}
                      </Text>
                      <Text color={subtleColor} fontSize="sm">
                        Please enter the 6-digit code below
                      </Text>
                    </VStack>

                    <HStack spacing={3} justify="center">
                      <PinInput
                        value={code}
                        onChange={(value) => setCode(value)}
                        size="lg"
                        placeholder=""
                        focusBorderColor="brand.500"
                      >
                        <PinInputField 
                          borderColor={borderColor} 
                          borderWidth="2px" 
                          borderRadius="xl"
                          bg={inputBg}
                          _hover={{ borderColor: 'brand.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        />
                        <PinInputField 
                          borderColor={borderColor} 
                          borderWidth="2px" 
                          borderRadius="xl"
                          bg={inputBg}
                          _hover={{ borderColor: 'brand.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        />
                        <PinInputField 
                          borderColor={borderColor} 
                          borderWidth="2px" 
                          borderRadius="xl"
                          bg={inputBg}
                          _hover={{ borderColor: 'brand.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        />
                        <PinInputField 
                          borderColor={borderColor} 
                          borderWidth="2px" 
                          borderRadius="xl"
                          bg={inputBg}
                          _hover={{ borderColor: 'brand.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        />
                        <PinInputField 
                          borderColor={borderColor} 
                          borderWidth="2px" 
                          borderRadius="xl"
                          bg={inputBg}
                          _hover={{ borderColor: 'brand.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        />
                        <PinInputField 
                          borderColor={borderColor} 
                          borderWidth="2px" 
                          borderRadius="xl"
                          bg={inputBg}
                          _hover={{ borderColor: 'brand.300' }}
                          _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
                        />
                      </PinInput>
                    </HStack>

                    {countdown > 0 && (
                      <Text fontSize="sm" color={subtleColor} textAlign="center">
                        Resend code in 0:{countdown.toString().padStart(2, '0')}
                      </Text>
                    )}

                    {countdown === 0 && (
                      <Alert 
                        status="info" 
                        rounded="xl"
                        bg="blue.50"
                        border="1px solid"
                        borderColor="blue.200"
                        color="blue.800"
                      >
                        <AlertIcon color="blue.500" />
                        Reset code sent to your email. Please check your inbox or spam folder.
                      </Alert>
                    )}

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
                        loadingText="Verifying..."
                        isDisabled={code.length !== 6}
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
                        Verify Code
                      </Button>
                    </MotionBox>

                    <VStack spacing={3}>
                      <Link 
                        color="brand.500"
                        fontWeight="medium"
                        display="flex"
                        alignItems="center"
                        gap={2}
                        onClick={() => navigate('/login')}
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
                    </VStack>
                  </VStack>
                </Box>
              )}

              {/* Step 3: New Password */}
              {step === 'password' && (
                <Box as="form" onSubmit={(e: React.FormEvent) => { e.preventDefault(); handleResetPassword(); }} w="full">
                  <VStack spacing={6}>
                    <VStack spacing={2} textAlign="center">
                      <Text color="green.500" fontWeight="bold" fontSize="md">
                        ✓ Code Verified Successfully
                      </Text>
                      <Text color={subtleColor} fontSize="sm">
                        Create a new secure password for your account
                      </Text>
                    </VStack>

                    <FormControl isRequired>
                      <FormLabel 
                        color={textColor} 
                        fontWeight="semibold"
                        fontSize="sm"
                        mb={2}
                      >
                        New Password
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
                          type={showNewPassword ? "text" : "password"}
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="Enter new password"
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
                          onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                          <Icon as={showNewPassword ? FiEyeOff : FiEye} />
                        </InputRightElement>
                      </InputGroup>
                    </FormControl>

                    <FormControl isRequired>
                      <FormLabel 
                        color={textColor} 
                        fontWeight="semibold"
                        fontSize="sm"
                        mb={2}
                      >
                        Confirm New Password
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
                          type={showConfirmPassword ? "text" : "password"}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm new password"
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
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                          <Icon as={showConfirmPassword ? FiEyeOff : FiEye} />
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
                        loadingText="Resetting Password..."
                        isDisabled={!newPassword || !confirmPassword}
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
                        Reset Password
                      </Button>
                    </MotionBox>
                  </VStack>
                </Box>
              )}
            </MotionVStack>
          </MotionBox>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default ResetPasswordPage;