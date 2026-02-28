import React from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  IconButton,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { FiFolder, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
import DocumentManager from './DocumentManager';

interface DocumentPanelProps {
  isCollapsed?: boolean;
  onToggle?: () => void;
  selectedDocuments?: number[];
  onDocumentSelectionChange?: (documentIds: number[]) => void;
  refreshTrigger?: number;
}

const DocumentPanel: React.FC<DocumentPanelProps> = ({
  isCollapsed = false,
  onToggle,
  selectedDocuments = [],
  onDocumentSelectionChange,
  refreshTrigger = 0
}) => {
  const bgColor = useColorModeValue('glass-bg', 'glass-bg');
  const borderColor = useColorModeValue('glass-border', 'glass-border');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const iconBg = useColorModeValue('gray.100', 'gray.700');
  const hoverBg = useColorModeValue('rgba(249, 115, 22, 0.05)', 'rgba(249, 115, 22, 0.1)');

  return (
    <Box
      h="100%"
      w="100%"
      bg={bgColor}
      backdropFilter="blur(20px)"
      position="relative"
      overflow="hidden"
      display="flex"
      flexDirection="column"
    >
      {/* Header */}
      <Box 
        p={isCollapsed ? 2 : 4} 
        borderBottom="1px solid" 
        borderColor={borderColor}
        flexShrink={0}
        bg={bgColor}
        backdropFilter="blur(20px)"
      >
        {isCollapsed ? (
          <VStack spacing={3}>
            <Tooltip 
              label="Documents" 
              placement="left"
              hasArrow
              bg="gray.800"
              color="white"
              fontSize="sm"
            >
              <Box
                p={2}
                rounded="lg"
                bg={iconBg}
                color={subtleColor}
                _hover={{ bg: hoverBg, color: 'brand.500' }}
                transition="all 0.2s"
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                <FiFolder size={20} />
              </Box>
            </Tooltip>
            
            <Tooltip 
              label="Expand panel" 
              placement="left"
              hasArrow
              bg="gray.800"
              color="white"
              fontSize="sm"
            >
              <IconButton
                aria-label="Expand panel"
                icon={<FiChevronLeft />}
                onClick={onToggle}
                variant="ghost"
                size="sm"
                rounded="lg"
                _hover={{
                  bg: hoverBg,
                  color: 'brand.500',
                  transform: 'translateX(-2px)',
                }}
                transition="all 0.3s"
              />
            </Tooltip>
          </VStack>
        ) : (
          <HStack justify="space-between" align="center">
            <HStack spacing={3}>
              <Icon as={FiFolder} color="brand.500" w={5} h={5} />
              <Text 
                fontSize="lg" 
                fontWeight="bold" 
                color={textColor}
                letterSpacing="tight"
              >
                Documents
              </Text>
            </HStack>
            
            <IconButton
              aria-label="Collapse panel"
              icon={<FiChevronRight />}
              onClick={onToggle}
              variant="ghost"
              size="sm"
              rounded="lg"
              _hover={{
                bg: hoverBg,
                color: 'brand.500',
                transform: 'translateX(2px)',
              }}
              transition="all 0.3s"
            />
          </HStack>
        )}
      </Box>

      {/* Document Manager */}
      <Box 
        flex={1} 
        overflowY="auto" 
        overflowX="hidden"
        className="hide-scrollbar"
        p={isCollapsed ? 1 : 4}
      >
        <DocumentManager
          isCollapsed={isCollapsed}
          selectedDocuments={selectedDocuments}
          onDocumentSelectionChange={onDocumentSelectionChange}
          showSelection={true}
          refreshTrigger={refreshTrigger}
        />
      </Box>
    </Box>
  );
};

export default DocumentPanel;