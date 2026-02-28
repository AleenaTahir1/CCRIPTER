import React from 'react';
import {
  Avatar as ChakraAvatar,
  AvatarProps as ChakraAvatarProps,
  Box,
  useColorModeValue,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';

const MotionBox = motion(Box);

interface UserAvatarProps extends Omit<ChakraAvatarProps, 'src'> {
  name?: string;
  profilePicture?: string;
  showBorder?: boolean;
  isAnimated?: boolean;
}

const UserAvatar: React.FC<UserAvatarProps> = ({
  name,
  profilePicture,
  showBorder = true,
  isAnimated = true,
  size = 'md',
  ...rest
}) => {
  const bgColor = useColorModeValue('brand.500', 'brand.500');
  const borderColor = useColorModeValue('white', 'surface.900');

  const getInitials = (name?: string): string => {
    if (!name) return '';
    const parts = name.split(' ');
    if (parts.length === 1) return name.substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const resolvedSrc = profilePicture && profilePicture.trim().length > 0 ? profilePicture : undefined;

  const avatar = (
    <ChakraAvatar
      name={name}
      src={resolvedSrc}
      bg={bgColor}
      color="surface.950"
      fontWeight="bold"
      fontFamily="heading"
      size={size}
      border={showBorder ? '2px solid' : 'none'}
      borderColor={borderColor}
      shadow={showBorder ? 'sm' : 'none'}
      {...rest}
      getInitials={getInitials}
    />
  );

  if (isAnimated) {
    return (
      <MotionBox
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 400, damping: 17 }}
      >
        {avatar}
      </MotionBox>
    );
  }

  return avatar;
};

export default UserAvatar;
