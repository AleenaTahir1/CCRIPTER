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
  useBreakpointValue,
  MenuDivider,
  Portal,
} from '@chakra-ui/react';
import { FiSun, FiMoon, FiLogOut, FiUser, FiMenu, FiKey } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import UserAvatar from '../common/UserAvatar';
import NeuralLogo from '../common/NeuralLogo';
import { useNavigate } from 'react-router-dom';

const MotionBox = motion(Box);

interface HeaderProps {
  onSidebarToggle?: () => void;
}

const Header: React.FC<HeaderProps> = ({ onSidebarToggle }) => {
  const { user, logout } = useAuth();
  const { colorMode, toggleColorMode } = useColorMode();
  const navigate = useNavigate();

  const bgColor = useColorModeValue('rgba(255,255,255,0.6)', 'rgba(9, 9, 11, 0.7)');
  const borderColor = useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.04)');
  const textColor = useColorModeValue('surface.800', 'surface.100');
  const subtleColor = useColorModeValue('surface.500', 'surface.500');
  const hoverBg = useColorModeValue('surface.100', 'whiteAlpha.100');
  const menuBg = useColorModeValue('rgba(255,255,255,0.95)', 'rgba(15,15,18,0.95)');
  const menuBorder = useColorModeValue('surface.200', 'rgba(255,255,255,0.06)');
  const menuDivider = useColorModeValue('surface.100', 'whiteAlpha.50');
  const menuHover = useColorModeValue('surface.50', 'whiteAlpha.50');
  const menuRedHover = useColorModeValue('red.50', 'rgba(239,68,68,0.1)');

  const isMobile = useBreakpointValue({ base: true, md: false });

  return (
    <MotionBox
      initial={{ y: -10, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      position="sticky"
      top={0}
      zIndex={100}
    >
      <Box
        bg={bgColor}
        backdropFilter="blur(20px) saturate(1.3)"
        borderBottom="1px solid"
        borderColor={borderColor}
        px={{ base: 4, md: 5 }}
        py={3}
      >
        <Flex align="center" maxW="100%" mx="auto">
          {isMobile && (
            <IconButton
              aria-label="Toggle sidebar"
              icon={<FiMenu />}
              onClick={onSidebarToggle}
              variant="ghost"
              size="sm"
              mr={3}
              color={subtleColor}
              _hover={{ color: textColor, bg: hoverBg }}
            />
          )}

          {/* Logo */}
          <HStack spacing={3}>
            <NeuralLogo size={32} />

            <Box>
              <Text
                fontFamily="heading"
                fontWeight="700"
                fontSize={{ base: 'md', md: 'lg' }}
                letterSpacing="-0.02em"
                color={textColor}
              >
                CCRIPTER
              </Text>
              {!isMobile && (
                <Text fontSize="xs" color={subtleColor} fontWeight="400" mt={-0.5}>
                  AI Companion
                </Text>
              )}
            </Box>
          </HStack>

          <Spacer />

          {/* Controls */}
          <HStack spacing={1}>
            <IconButton
              aria-label={colorMode === 'light' ? 'Dark mode' : 'Light mode'}
              icon={colorMode === 'light' ? <FiMoon size={16} /> : <FiSun size={16} />}
              onClick={toggleColorMode}
              variant="ghost"
              size="sm"
              rounded="lg"
              color={subtleColor}
              _hover={{
                color: 'brand.500',
                bg: hoverBg,
              }}
              transition="all 0.2s"
            />

            <Menu>
              <MenuButton
                as={IconButton}
                icon={
                  <UserAvatar
                    size="sm"
                    name={user?.name}
                    profilePicture={user?.profile_picture}
                  />
                }
                variant="ghost"
                rounded="full"
                size="sm"
                _hover={{ opacity: 0.8 }}
              />
              <Portal>
                <MenuList
                  bg={menuBg}
                  backdropFilter="blur(20px)"
                  border="1px solid"
                  borderColor={menuBorder}
                  shadow="0 16px 48px rgba(0,0,0,0.2)"
                  rounded="xl"
                  minW="220px"
                  py={2}
                  mt={1}
                  zIndex={2000}
                >
                  <Box px={4} py={3} borderBottom="1px solid" borderColor={menuDivider}>
                    <Text fontWeight="600" fontSize="sm" color={textColor}>
                      {user?.name}
                    </Text>
                    <Text fontSize="xs" color={subtleColor} noOfLines={1}>
                      {user?.email}
                    </Text>
                  </Box>

                  <MenuItem
                    icon={<FiUser size={14} />}
                    onClick={() => navigate('/profile')}
                    fontSize="sm"
                    fontWeight="500"
                    py={2.5}
                    _hover={{ bg: menuHover }}
                  >
                    Profile
                  </MenuItem>

                  <MenuItem
                    icon={<FiKey size={14} />}
                    onClick={() => navigate('/profile?tab=security')}
                    fontSize="sm"
                    fontWeight="500"
                    py={2.5}
                    _hover={{ bg: menuHover }}
                  >
                    Security
                  </MenuItem>

                  <MenuDivider borderColor={menuDivider} />

                  <MenuItem
                    icon={<FiLogOut size={14} />}
                    onClick={logout}
                    color="red.400"
                    fontSize="sm"
                    fontWeight="500"
                    py={2.5}
                    _hover={{ bg: menuRedHover }}
                  >
                    Sign Out
                  </MenuItem>
                </MenuList>
              </Portal>
            </Menu>
          </HStack>
        </Flex>
      </Box>
    </MotionBox>
  );
};

export default Header;
