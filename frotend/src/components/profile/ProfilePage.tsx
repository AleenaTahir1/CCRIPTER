import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Container,
  VStack,
  HStack,
  Text,
  Heading,
  Button,
  FormControl,
  FormLabel,
  Input,
  FormHelperText,
  useColorModeValue,
  useToast,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  Avatar,
  AvatarBadge,
  IconButton,
  Divider,
  InputGroup,
  InputRightElement,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
  Spacer,
  Badge,
} from '@chakra-ui/react';
import { FiEdit, FiSave, FiX, FiUpload, FiLock, FiEye, FiEyeOff, FiKey, FiUser, FiMail } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { profileAPI } from '../../lib/api'; // Changed from authAPI to profileAPI
import { useLocation, useNavigate } from 'react-router-dom';
import UserAvatar from '../common/UserAvatar';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);

const ProfilePage: React.FC = () => {
  const { user, setUser } = useAuth(); // Added setUser to update context
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State for profile data
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profilePicture, setProfilePicture] = useState<string | undefined>(user?.profile_picture || undefined);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [profileError, setProfileError] = useState('');
  
  // State for password change
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isPasswordChanging, setIsPasswordChanging] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  
  // Get tab from URL search params
  const searchParams = new URLSearchParams(location.search);
  const tabParam = searchParams.get('tab');
  const [activeTab, setActiveTab] = useState(tabParam === 'security' ? 1 : 0);
  
  // Theme colors
  const bgColor = useColorModeValue('glass-bg', 'glass-bg');
  const borderColor = useColorModeValue('glass-border', 'glass-border');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const cardBg = useColorModeValue('white', 'gray.800');
  const cardBorderColor = useColorModeValue('gray.200', 'gray.700');
  const inputBg = useColorModeValue('white', 'gray.800');
  const inputBorderColor = useColorModeValue('gray.200', 'gray.700');
  const labelColor = useColorModeValue('gray.800', 'gray.100');
  const brandIconColor = useColorModeValue('brand.500', 'brand.400');
  
  // Update state when user data changes
  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setEmail(user.email || '');
      setProfilePicture(user.profile_picture || undefined);
    }
  }, [user]);
  
  // Handle tab change
  const handleTabChange = (index: number) => {
    setActiveTab(index);
    navigate(index === 0 ? '/profile' : '/profile?tab=security');
  };

  // Start profile editing
  const handleEditProfile = () => {
    setIsProfileEditing(true);
  };
  
  // Cancel profile editing
  const handleCancelEdit = () => {
    setName(user?.name || '');
    setEmail(user?.email || '');
    setProfilePicture(user?.profile_picture || undefined);
    setIsProfileEditing(false);
    setProfileError('');
  };
  
  // Save profile changes
  const handleSaveProfile = async () => {
    if (!name.trim()) {
      setProfileError('Name is required');
      return;
    }
    
    setIsSaving(true);
    setProfileError('');
    
    try {
      const response = await profileAPI.updateProfile({
        name,
        email,
        profile_picture: profilePicture
      });
      
      // Update user in context
      if (setUser) {
        setUser(response.data);
      }
      
      setIsProfileEditing(false);
      toast({
        title: 'Profile updated',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      setProfileError(error.response?.data?.detail || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };
  
  // Handle file upload for profile picture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Check file size (limit to 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Profile picture must be less than 2MB',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    // Check file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file',
        status: 'error',
        duration: 3000,
      });
      return;
    }
    
    // Upload file using profileAPI
    try {
      const response = await profileAPI.uploadProfilePicture(file);
      // Refresh profile from backend so avatars update across the app
      try {
        const me = await profileAPI.getProfile();
        setProfilePicture(me.data.profile_picture || undefined);
        if (setUser) {
          setUser(me.data);
        }
      } catch (fetchErr) {
        // Fallback to response payload if profile fetch fails
        setProfilePicture(response.data.profile_picture || undefined);
      }
      toast({
        title: 'Profile picture uploaded',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Failed to upload profile picture:', error);
      toast({
        title: 'Upload failed',
        description: error.response?.data?.detail || 'Failed to upload profile picture',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  // Remove profile picture
  const handleRemoveProfilePicture = async () => {
    try {
      const response = await profileAPI.updateProfile({
        profile_picture: '' as any
      });
      
      // Update user in context
      if (setUser) {
        setUser(response.data);
      }

      setProfilePicture(undefined);
      toast({
        title: 'Profile picture removed',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Failed to remove profile picture:', error);
      toast({
        title: 'Failed to remove profile picture',
        description: error.response?.data?.detail || 'Failed to remove profile picture',
        status: 'error',
        duration: 3000,
      });
    }
  };
  
  // Change password
  const handleChangePassword = async () => {
    // Validate password
    if (!currentPassword) {
      setPasswordError('Current password is required');
      return;
    }
    
    if (!newPassword) {
      setPasswordError('New password is required');
      return;
    }
    
    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }
    
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }
    
    setIsPasswordChanging(true);
    setPasswordError('');
    
    try {
      await profileAPI.changePassword({
        current_password: currentPassword,
        new_password: newPassword
      });
      
      // Clear fields
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      toast({
        title: 'Password changed successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error: any) {
      console.error('Failed to change password:', error);
      setPasswordError(error.response?.data?.detail || 'Failed to change password');
    } finally {
      setIsPasswordChanging(false);
    }
  };
  
  // JSX for Profile Tab
  const renderProfileTab = () => (
    <MotionVStack
      spacing={6}
      align="stretch"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {profileError && (
        <Alert status="error" rounded="md">
          <AlertIcon />
          {profileError}
        </Alert>
      )}
      
      {/* Profile Picture */}
      <Flex justify="center" mb={4} direction="column" align="center">
        <Box position="relative">
          <Box
            as="button"
            onClick={() => fileInputRef.current?.click()}
            cursor="pointer"
            _hover={{ transform: 'scale(1.02)' }}
            transition="all 0.2s"
          >
            <UserAvatar
              size="2xl"
              name={name}
              profilePicture={profilePicture}
              borderColor={borderColor}
            />
          </Box>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            style={{ display: 'none' }}
            accept="image/*"
          />
        </Box>
        <HStack mt={3} spacing={3}>
          <Button
            leftIcon={<FiUpload />}
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
            color="white"
            border="1px solid"
            borderColor="brand.400"
            shadow="sm"
            _hover={{
              bgGradient: "linear(135deg, brand.600 0%, brand.700 100%)",
              transform: 'translateY(-1px)',
              shadow: 'md',
            }}
          >
            Change Photo
          </Button>
          {profilePicture && (
            <Button
              leftIcon={<FiX />}
              size="sm"
              onClick={handleRemoveProfilePicture}
              variant="outline"
              colorScheme="red"
              borderColor="red.300"
              _hover={{ bg: 'red.50' }}
            >
              Remove
            </Button>
          )}
        </HStack>
      </Flex>
      
      {/* User Info Card with edit icon */}
      <Box
        p={6}
        bg={cardBg}
        borderRadius="lg"
        border="1px solid"
        borderColor={cardBorderColor}
        position="relative"
      >
        <IconButton
          aria-label={isProfileEditing ? 'Cancel editing' : 'Edit profile'}
          icon={isProfileEditing ? <FiX /> : <FiEdit />}
          position="absolute"
          top={3}
          right={3}
          size="sm"
          variant="ghost"
          onClick={() => {
            if (isProfileEditing) {
              handleCancelEdit();
            } else {
              setIsProfileEditing(true);
            }
          }}
        />

        <VStack spacing={7} align="stretch">
          <FormControl>
            <FormLabel color={labelColor} fontWeight="semibold">
              <HStack spacing={2}>
                <Box as={FiUser} color={brandIconColor} />
                <Text>Full Name</Text>
              </HStack>
            </FormLabel>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              isReadOnly={!isProfileEditing}
              bg={inputBg}
              border="1px solid"
              borderColor={inputBorderColor}
              borderRadius="2xl"
              color={textColor}
              px={5}
              py={6}
              _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            />
          </FormControl>

          <FormControl>
            <FormLabel color={labelColor} fontWeight="semibold">
              <HStack spacing={2}>
                <Box as={FiMail} color={brandIconColor} />
                <Text>Email Address</Text>
              </HStack>
            </FormLabel>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              isReadOnly={!isProfileEditing}
              bg={inputBg}
              border="1px solid"
              borderColor={inputBorderColor}
              borderRadius="2xl"
              color={textColor}
              px={5}
              py={6}
              _focus={{ borderColor: 'brand.500', boxShadow: '0 0 0 1px var(--chakra-colors-brand-500)' }}
            />
            <FormHelperText color={subtleColor}>
              This email is used for notifications and password resets
            </FormHelperText>
          </FormControl>
        </VStack>
      </Box>
      
      {/* Action Buttons */}
      <Flex mt={4}>
        <Button 
          leftIcon={<FiSave />}
          onClick={handleSaveProfile}
          isLoading={isSaving}
          bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
          color="white"
          border="1px solid"
          borderColor="brand.400"
          shadow="sm"
          _hover={{
            bgGradient: "linear(135deg, brand.600 0%, brand.700 100%)",
            transform: 'translateY(-1px)',
            shadow: 'md',
          }}
          isDisabled={!isProfileEditing && name === (user?.name || '') && email === (user?.email || '')}
        >
          Save Changes
        </Button>
        <Button 
          leftIcon={<FiX />}
          variant="outline"
          ml={3}
          onClick={handleCancelEdit}
          isDisabled={isSaving}
          borderColor="gray.300"
          _hover={{ bg: 'gray.50' }}
        >
          Cancel
        </Button>
      </Flex>
    </MotionVStack>
  );
  
  // JSX for Security Tab
  const renderSecurityTab = () => (
    <MotionVStack
      spacing={6}
      align="stretch"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <Box
        p={6}
        bg={cardBg}
        borderRadius="lg"
        border="1px solid"
        borderColor={borderColor}
        shadow="sm"
      >
        <Heading size="md" mb={4} color={textColor}>
          <HStack>
            <FiKey />
            <Text>Change Password</Text>
          </HStack>
        </Heading>
        
        {passwordError && (
          <Alert status="error" mb={4} rounded="md">
            <AlertIcon />
            {passwordError}
          </Alert>
        )}
        
        <VStack spacing={4} align="stretch">
          <FormControl isRequired>
            <FormLabel color={textColor}>Current Password</FormLabel>
            <InputGroup>
              <Input
                type={showCurrentPassword ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                bg={cardBg}
                borderColor={borderColor}
                color={textColor}
                _focus={{ borderColor: 'brand.500' }}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showCurrentPassword ? "Hide password" : "Show password"}
                  icon={showCurrentPassword ? <FiEyeOff /> : <FiEye />}
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  variant="ghost"
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel color={textColor}>New Password</FormLabel>
            <InputGroup>
              <Input
                type={showNewPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                bg={cardBg}
                borderColor={borderColor}
                color={textColor}
                _focus={{ borderColor: 'brand.500' }}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showNewPassword ? "Hide password" : "Show password"}
                  icon={showNewPassword ? <FiEyeOff /> : <FiEye />}
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  variant="ghost"
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
            <FormHelperText color={subtleColor}>
              Password must be at least 6 characters
            </FormHelperText>
          </FormControl>
          
          <FormControl isRequired>
            <FormLabel color={textColor}>Confirm New Password</FormLabel>
            <InputGroup>
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                bg={cardBg}
                borderColor={borderColor}
                color={textColor}
                _focus={{ borderColor: 'brand.500' }}
              />
              <InputRightElement>
                <IconButton
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  icon={showConfirmPassword ? <FiEyeOff /> : <FiEye />}
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  variant="ghost"
                  size="sm"
                />
              </InputRightElement>
            </InputGroup>
          </FormControl>
          
          <Button
            leftIcon={<FiLock />}
            onClick={handleChangePassword}
            isLoading={isPasswordChanging}
            alignSelf="flex-start"
            mt={2}
            bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
            color="white"
            border="1px solid"
            borderColor="brand.400"
            shadow="sm"
            _hover={{
              bgGradient: "linear(135deg, brand.600 0%, brand.700 100%)",
              transform: 'translateY(-1px)',
              shadow: 'md',
            }}
          >
            Change Password
          </Button>
        </VStack>
      </Box>
    </MotionVStack>
  );
  
  return (
    <Box
      minH="100vh"
      bgGradient={useColorModeValue(
        'linear(135deg, gray.25 0%, gray.50 100%)',
        'linear(135deg, gray.950 0%, gray.900 100%)'
      )}
      py={10}
    >
      <Container maxW="container.md">
        <MotionBox
          bg={bgColor}
          backdropFilter="blur(20px)"
          borderRadius="2xl"
          boxShadow="xl"
          p={8}
          borderWidth="1px"
          borderColor={borderColor}
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          {/* Page Header */}
          <HStack mb={8} spacing={4}>
            <Heading size="lg" color={textColor}>
              My Profile
            </Heading>
            <Spacer />
            <Button
              size="sm"
              onClick={() => navigate('/')}
              variant="ghost"
            >
              Back to Dashboard
            </Button>
          </HStack>
          
          <Divider mb={6} />
          
          {/* Tabs */}
          <Tabs variant="enclosed" colorScheme="brand" index={activeTab} onChange={handleTabChange}>
            <TabList>
              <Tab>Profile Information</Tab>
              <Tab>Security</Tab>
            </TabList>
            <TabPanels mt={6}>
              <TabPanel p={0}>{renderProfileTab()}</TabPanel>
              <TabPanel p={0}>{renderSecurityTab()}</TabPanel>
            </TabPanels>
          </Tabs>
        </MotionBox>
      </Container>
    </Box>
  );
};

export default ProfilePage;