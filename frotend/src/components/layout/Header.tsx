import React from 'react';
import {
  Box,
  Flex,
  HStack,
  Text,
  Spacer,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  IconButton,
  useColorMode,
  useColorModeValue,
  Badge,
  useBreakpointValue,
  MenuDivider,
  Portal,
} from '@chakra-ui/react';
import { FiSun, FiMoon, FiLogOut, FiUser, FiMenu, FiSidebar, FiSettings, FiEdit, FiKey } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../common/UserAvatar';
import { useNavigate } from 'react-router-dom';

const MotionBox = motion(Box);

interface HeaderProps {
  onSidebarToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSidebarToggle }) => {
  const { user, logout } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();
  
  const bgColor = useColorModeValue('glass-bg', 'glass-bg');
  const borderColor = useColorModeValue('glass-border', 'glass-border');
  const logoGradient = useColorModeValue(
    'linear(135deg, brand.500 0%, brand.600 100%)',
    'linear(135deg, brand.400 0%, brand.500 100%)'
  );
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const menuItemHoverBg = useColorModeValue('gray.100', 'gray.700');
  const themeHoverBg = useColorModeValue('gray.100', 'gray.700');
  const themeHoverColor = useColorModeValue('brand.500', 'brand.400');
  const avatarBorder = useColorModeValue('white', 'gray.800');
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  
  const handleProfileClick = () => {
    navigate('/profile');
  };

  return (
    <MotionBox
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      position="sticky"
      top={0}
      zIndex={100}
    >
      <Box
        bg={bgColor}
        backdropFilter="blur(20px)"
        borderBottom="1px solid"
        borderColor={borderColor}
        px={{ base: 4, md: 6 }}
        py={4}
        shadow="glass"
      >
        <Flex align="center" maxW="100%" mx="auto">
          {/* Sidebar Toggle - Mobile */}
          {isMobile && (
            <IconButton
              aria-label="Toggle sidebar"
              icon={<FiMenu />}
              onClick={onSidebarToggle}
              variant="ghost"
              size="sm"
              mr={3}
              _hover={{
                bg: menuItemHoverBg,
                transform: 'scale(1.05)',
              }}
              transition="all 0.2s"
            />
          )}
          
          {/* Logo and Brand */}
          <HStack spacing={3}>
            <MotionBox
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Box
                w={{ base: 10, md: 12 }}
                h={{ base: 10, md: 12 }}
                bgGradient={logoGradient}
                rounded="xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                shadow="lg"
                position="relative"
                _before={{
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  rounded: 'xl',
                  p: '1px',
                  bgGradient: 'linear(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'subtract',
                }}
              >
                <Text 
                  color="white" 
                  fontWeight="black" 
                  fontSize={{ base: 'lg', md: 'xl' }}
                  letterSpacing="tight"
                >
                  CC
                </Text>
              </Box>
            </MotionBox>
            
            <Box>
              <HStack spacing={2} align="center">
                <Text 
                  fontWeight="bold" 
                  fontSize={{ base: 'lg', md: 'xl' }}
                  color={textColor}
                  className="gradient-text"
                >
                  CCRIPTER
                </Text>
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
                fontSize={{ base: 'xs', md: 'sm' }} 
                color={subtleColor}
                fontWeight="medium"
              >
                Voice Assistant
              </Text>
            </Box>
          </HStack>
          
          <Spacer />
          
          {/* Controls */}
          <Flex align="center" gap={2}>
            {/* Theme Toggle */}
            <MotionBox
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <IconButton
                aria-label={colorMode === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
                icon={colorMode === 'light' ? <FiMoon /> : <FiSun />}
                onClick={toggleColorMode}
                variant="ghost"
                size="md"
                rounded="xl"
                color={subtleColor}
                _hover={{
                  bg: themeHoverBg,
                  color: themeHoverColor,
                  transform: 'rotate(180deg)',
                }}
                transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              />
            </MotionBox>
            
            {/* User Menu */}
            <Menu>
              <MotionBox
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <MenuButton
                  as={IconButton}
                  icon={
                    <UserAvatar 
                      size="sm" 
                      name={user?.name} 
                      profilePicture={user?.profile_picture}
                      borderColor={avatarBorder}
                    />
                  }
                  variant="ghost"
                  rounded="full"
                  _hover={{
                    transform: 'scale(1.05)',
                  }}
                  transition="all 0.2s"
                />
              </MotionBox>
              <Portal>
                <MenuList
                  bg={useColorModeValue('rgba(255,255,255,0.98)', 'rgba(31,41,55,0.95)')}
                  color={useColorModeValue('gray.800', 'gray.100')}
                  backdropFilter="blur(12px)"
                  border="1px solid"
                  borderColor={useColorModeValue('gray.200', 'gray.700')}
                  shadow="2xl"
                  rounded="xl"
                  minW="260px"
                  overflow="hidden"
                  py={2}
                  mt={2}
                  zIndex={2000}
                >
                <Box p={4} borderBottom="1px solid" borderColor={useColorModeValue('gray.200', 'gray.700')} mb={1}>
                  <HStack spacing={3} align="start">
                    <UserAvatar 
                      size="md" 
                      name={user?.name} 
                      profilePicture={user?.profile_picture} 
                      isAnimated={false}
                    />
                    <Box>
                      <Text fontWeight="semibold" color={useColorModeValue('gray.800','gray.100')}>
                        {user?.name}
                      </Text>
                      <Text fontSize="sm" color={useColorModeValue('gray.600','gray.300')} noOfLines={1}>
                        {user?.email}
                      </Text>
                    </Box>
                  </HStack>
                </Box>
                
                <MenuItem 
                  icon={<FiUser />} 
                  onClick={handleProfileClick}
                  color={useColorModeValue('gray.800','gray.100')}
                  _hover={{ bg: useColorModeValue('gray.100','gray.700'), transform: 'translateX(2px)' }}
                  transition="all 0.2s"
                  mx={2}
                  rounded="md"
                  fontSize="sm"
                  fontWeight="medium"
                  p={3}
                >
                  Profile Settings
                </MenuItem>
                
                <MenuItem 
                  icon={<FiKey />} 
                  onClick={() => navigate('/profile?tab=security')}
                  color={useColorModeValue('gray.800','gray.100')}
                  _hover={{ bg: useColorModeValue('gray.100','gray.700'), transform: 'translateX(2px)' }}
                  transition="all 0.2s"
                  mx={2}
                  rounded="md"
                  fontSize="sm"
                  fontWeight="medium"
                  p={3}
                >
                  Security
                </MenuItem>
                
                <MenuDivider mx={2} my={2} borderColor={useColorModeValue('gray.200', 'gray.700')} />
                
                <MenuItem 
                  icon={<FiLogOut />} 
                  onClick={logout}
                  color={useColorModeValue('red.600','red.400')}
                  _hover={{
                    bg: useColorModeValue('red.50','gray.700'),
                    color: useColorModeValue('red.600','red.400'),
                    transform: 'translateX(2px)'
                  }}
                  transition="all 0.2s"
                  mx={2}
                  rounded="md"
                  fontSize="sm"
                  fontWeight="medium"
                  p={3}
                >
                  Sign Out
                </MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          </Flex>
        </Flex>
      </Box>
    </MotionBox>
  );
};

export default Header;
