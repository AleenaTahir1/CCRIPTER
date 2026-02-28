import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Button,
  IconButton,
  Spinner,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  MenuDivider,
  Portal,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  useColorModeValue,
  useDisclosure,
  useToast,
  Checkbox,
  Tooltip,
} from '@chakra-ui/react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiFolder,
  FiFileText,
  FiFile,
  FiImage,
  FiUpload,
  FiEye,
  FiTrash2,
  FiMoreHorizontal,
  FiMessageCircle,
} from 'react-icons/fi';
import { documentAPI } from '../../lib/api';
import FileUpload from './FileUpload';
import { Document } from '../../types';

const MotionBox = motion(Box);

interface DocumentManagerProps {
  isCollapsed?: boolean;
  selectedDocuments?: number[];
  onDocumentSelectionChange?: (documentIds: number[]) => void;
  showSelection?: boolean;
  refreshTrigger?: number; // Add refresh trigger prop
}

const DocumentManager: React.FC<DocumentManagerProps> = ({ 
  isCollapsed = false,
  selectedDocuments = [],
  onDocumentSelectionChange,
  showSelection = false,
  refreshTrigger = 0
}) => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [viewingDocument, setViewingDocument] = useState<Document | null>(null);
  const { isOpen, onOpen, onClose } = useDisclosure();
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const activeBg = useColorModeValue('blue.50', 'blue.900');
  const iconBg = useColorModeValue('gray.100', 'gray.700');
  const menuListBg = useColorModeValue('white', 'gray.700');
  const menuListBorder = useColorModeValue('gray.200', 'gray.600');
  const menuItemHoverBg = useColorModeValue('blue.50', 'gray.700');
  const deleteItemHoverBg = useColorModeValue('red.100', 'red.900');
  const viewIconBg = useColorModeValue('blue.50', 'transparent');
  const viewIconColor = useColorModeValue('blue.500', 'blue.300');
  const deleteIconBg = useColorModeValue('red.50', 'transparent');
  const deleteIconColor = useColorModeValue('red.500', 'red.400');

  useEffect(() => {
    loadDocuments();
  }, []);

  // Refresh documents when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadDocuments();
    }
  }, [refreshTrigger]);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const response = await documentAPI.listDocuments();
      const raw: any = response?.data;
      const docs: Document[] = Array.isArray(raw)
        ? raw
        : (Array.isArray(raw?.documents) ? raw.documents : []);
      setDocuments(docs);
    } catch (error) {
      console.error('Failed to load documents:', error);
      toast({
        title: 'Error loading documents',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDocumentUploaded = (document: Document) => {
    // Add the new document to the list
    setDocuments(prev => [document, ...prev]);
    // Auto-select the uploaded document for chat context
    if (onDocumentSelectionChange && !selectedDocuments.includes(document.id)) {
      onDocumentSelectionChange([...selectedDocuments, document.id]);
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      await documentAPI.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      
      // Remove from selection if it was selected
      if (selectedDocuments.includes(documentId)) {
        const newSelection = selectedDocuments.filter(id => id !== documentId);
        onDocumentSelectionChange?.(newSelection);
      }
      
      toast({
        title: 'Document deleted successfully',
        status: 'success',
        duration: 3000,
      });
    } catch (error) {
      console.error('Failed to delete document:', error);
      toast({
        title: 'Failed to delete document',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleViewDocument = (document: Document) => {
    setViewingDocument(document);
    onOpen();
  };

  const handleDocumentToggle = (documentId: number, isChecked: boolean) => {
    let newSelection: number[];
    if (isChecked) {
      newSelection = [...selectedDocuments, documentId];
    } else {
      newSelection = selectedDocuments.filter(id => id !== documentId);
    }
    onDocumentSelectionChange?.(newSelection);
  };

  const getFileIcon = (fileType: string) => {
    const type = fileType.toLowerCase();
    if (type.includes('pdf')) {
      return { icon: FiFileText, color: 'red.500' };
    }
    if (type.includes('doc') || type.includes('docx')) {
      return { icon: FiFileText, color: 'blue.500' };
    }
    if (type.includes('txt')) {
      return { icon: FiFileText, color: 'gray.500' };
    }
    if (type.includes('image') || ['png', 'jpg', 'jpeg', 'gif', 'bmp', 'tiff', 'tif'].some(ext => type.includes(ext))) {
      return { icon: FiImage, color: 'green.500' };
    }
    return { icon: FiFile, color: 'gray.500' };
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString();
  };

  // Collapsed view - just show icon with document count
  if (isCollapsed) {
    return (
      <Box p={2}>
        <Tooltip 
          label="Documents" 
          placement="right"
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
            cursor="pointer"
            _hover={{ bg: hoverBg, color: 'brand.500' }}
            transition="all 0.2s"
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <FiFolder size={16} />
            {Array.isArray(documents) && documents.length > 0 && (
              <Badge
                colorScheme="brand"
                variant="solid"
                fontSize="xs"
                position="absolute"
                top={1}
                right={1}
                rounded="full"
                minW={5}
                h={5}
                display="flex"
                alignItems="center"
                justifyContent="center"
              >
                {documents.length}
              </Badge>
            )}
          </Box>
        </Tooltip>
      </Box>
    );
  }

  return (
    <>
      <Box>
        <VStack spacing={3} align="stretch">
          {/* Header */}
          <HStack justify="space-between" align="center" px={1}>
            <HStack spacing={2}>
              <Icon as={FiFolder} color="brand.500" w={4} h={4} />
              <Text 
                fontSize="sm" 
                fontWeight="semibold" 
                color={textColor}
                letterSpacing="tight"
              >
                Documents
              </Text>
              {documents.length > 0 && (
                <Badge colorScheme="brand" variant="subtle" rounded="full">
                  {documents.length}
                </Badge>
              )}
            </HStack>
            
            <FileUpload
              onFileUploaded={handleDocumentUploaded}
              isDisabled={isLoading}
            />
          </HStack>

          {/* Document List */}
          <Box maxH="300px" overflowY="auto" className="hide-scrollbar">
            {isLoading ? (
              <Box py={8} textAlign="center">
                <Spinner size="sm" color="brand.500" />
                <Text fontSize="sm" color={subtleColor} mt={2}>
                  Loading documents...
                </Text>
              </Box>
            ) : (!Array.isArray(documents) || documents.length === 0) ? (
              <Box py={8} textAlign="center">
                <Icon as={FiUpload} w={8} h={8} color={subtleColor} mb={2} />
                <Text fontSize="sm" color={subtleColor} mb={2}>
                  No documents yet
                </Text>
                <Text fontSize="xs" color={subtleColor}>
                  Upload PDFs, docs, or images to get started
                </Text>
              </Box>
            ) : (
              <VStack spacing={1} align="stretch">
                <AnimatePresence>
                  {(Array.isArray(documents) ? documents : ([] as Document[])).map((document, index) => {
                    const fileInfo = getFileIcon(document.file_type);
                    const isSelected = selectedDocuments.includes(document.id);
                    
                    return (
                      <MotionBox
                        key={document.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        whileHover={{ 
                          scale: 1.02,
                          transition: { duration: 0.2, ease: 'easeOut' },
                        }}
                        style={{ zIndex: 1 }}
                      >
                        <HStack
                          p={3}
                          rounded="lg"
                          bg={isSelected ? activeBg : 'transparent'}
                          _hover={{ bg: isSelected ? activeBg : hoverBg }}
                          justify="space-between"
                          transition="all 0.2s"
                          border="1px solid"
                          borderColor={isSelected ? "brand.500" : "transparent"}
                        >
                          <HStack flex={1} minW={0} spacing={3}>
                            {showSelection && (
                              <Checkbox
                                isChecked={isSelected}
                                onChange={(e) => handleDocumentToggle(document.id, e.target.checked)}
                                colorScheme="brand"
                                size="sm"
                              />
                            )}
                            
                            <Box
                              p={2}
                              rounded="lg"
                              bg={iconBg}
                              color={fileInfo.color}
                            >
                              <Icon as={fileInfo.icon} w={4} h={4} />
                            </Box>
                            
                            <VStack align="start" spacing={0} flex={1} minW={0}>
                              <Text 
                                fontSize="sm" 
                                fontWeight="medium"
                                noOfLines={1} 
                                color={textColor}
                              >
                                {document.filename}
                              </Text>
                              <HStack spacing={2}>
                                <Text fontSize="xs" color={subtleColor}>
                                  {formatFileSize(document.file_size)}
                                </Text>
                                <Text fontSize="xs" color={subtleColor}>
                                  •
                                </Text>
                                <Text fontSize="xs" color={subtleColor}>
                                  {formatDate(document.upload_date)}
                                </Text>
                              </HStack>
                            </VStack>
                          </HStack>
                          
                          <Menu closeOnSelect={true} autoSelect={false}>
                            <MenuButton
                              as={IconButton}
                              icon={<FiMoreHorizontal />}
                              size="sm"
                              variant="ghost"
                              rounded="full"
                              opacity={0.8}
                              _hover={{ 
                                opacity: 1, 
                                bg: iconBg,
                                transform: 'scale(1.15) rotate(90deg)',
                                shadow: 'md',
                                color: 'brand.500',
                                zIndex: 2000
                              }}
                              _active={{
                                transform: 'scale(0.95)',
                                bg: hoverBg
                              }}
                              transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                              zIndex={20}
                              color={subtleColor}
                            />
                            <Portal>
                              <MenuList 
                                bg={menuListBg} 
                                borderColor={menuListBorder} 
                                shadow="xl" 
                                rounded="xl"
                                border="1px solid"
                                zIndex={2000}
                                minW="200px"
                                py={2}
                                overflow="hidden"
                                sx={{
                                  zIndex: '2000 !important',
                                  animation: 'fadeInScale 120ms ease-out',
                                  '@keyframes fadeInScale': {
                                    from: { opacity: 0, transform: 'scale(0.98) translateY(-4px)' },
                                    to: { opacity: 1, transform: 'scale(1) translateY(0)' },
                                  },
                                }}
                              >
                                <MenuItem 
                                  icon={<Box p="1px" bg={viewIconBg} rounded="sm" zIndex={2000}><FiEye color={viewIconColor} /></Box>} 
                                  onClick={() => handleViewDocument(document)}
                                  _hover={{ bg: menuItemHoverBg, transform: 'translateX(3px)' }}
                                  fontWeight="medium"
                                  rounded="md"
                                  mx={1}
                                  mb={1}
                                  p={3}
                                  fontSize="sm"
                                  transition="all 0.2s"
                                  iconSpacing={3}
                                  position="relative"
                                  zIndex={2000}
                                >
                                  View Details
                                </MenuItem>
                                <MenuDivider mx={2} my={1} borderColor={borderColor} />
                                <MenuItem
                                  icon={<Box p="1px" bg={deleteIconBg} rounded="sm" zIndex={2000}><FiTrash2 color={deleteIconColor} /></Box>}
                                  onClick={() => handleDeleteDocument(document.id)}
                                  color="red.500"
                                  _hover={{ 
                                    bg: deleteItemHoverBg,
                                    color: 'red.600',
                                    transform: 'translateX(3px)'
                                  }}
                                  fontWeight="medium"
                                  rounded="md"
                                  mx={1}
                                  p={3}
                                  fontSize="sm"
                                  transition="all 0.2s"
                                  iconSpacing={3}
                                  position="relative"
                                  zIndex={2000}
                                >
                                  Delete
                                </MenuItem>
                              </MenuList>
                            </Portal>
                          </Menu>
                        </HStack>
                      </MotionBox>
                    );
                  })}
                </AnimatePresence>
              </VStack>
            )}
          </Box>

          {/* Selection Actions */}
          {showSelection && selectedDocuments.length > 0 && (
            <Box
              p={3}
              bg={activeBg}
              rounded="lg"
              border="1px solid"
              borderColor="brand.500"
            >
              <HStack justify="space-between">
                <Text fontSize="sm" color={textColor}>
                  {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''} selected
                </Text>
                <Button
                  size="xs"
                  leftIcon={<FiMessageCircle />}
                  colorScheme="brand"
                  variant="solid"
                >
                  Chat with Selected
                </Button>
              </HStack>
            </Box>
          )}
        </VStack>
      </Box>

      {/* Document Details Modal */}
      <Modal isOpen={isOpen} onClose={onClose} size="xl">
        <ModalOverlay bg="blackAlpha.300" />
        <ModalContent bg={bgColor} rounded="2xl" mx={4}>
          <ModalHeader>
            <HStack>
              {viewingDocument && (
                <>
                  <Icon 
                    as={getFileIcon(viewingDocument.file_type).icon} 
                    color={getFileIcon(viewingDocument.file_type).color}
                    w={5} h={5}
                  />
                  <Text>{viewingDocument.filename}</Text>
                </>
              )}
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            {viewingDocument && (
              <VStack spacing={4} align="stretch">
                <HStack spacing={4}>
                  <Badge colorScheme="blue" variant="subtle">
                    {viewingDocument.file_type}
                  </Badge>
                  <Text fontSize="sm" color={subtleColor}>
                    {formatFileSize(viewingDocument.file_size)}
                  </Text>
                  <Text fontSize="sm" color={subtleColor}>
                    {formatDate(viewingDocument.upload_date)}
                  </Text>
                </HStack>

                {viewingDocument.extracted_text && (
                  <Box>
                    <Text fontSize="sm" fontWeight="semibold" mb={2} color={textColor}>
                      Extracted Text:
                    </Text>
                    <Box
                      p={4}
                      bg={iconBg}
                      rounded="lg"
                      border="1px solid"
                      borderColor={borderColor}
                      maxH="300px"
                      overflowY="auto"
                    >
                      <Text fontSize="sm" color={textColor} whiteSpace="pre-wrap">
                        {viewingDocument.extracted_text}
                      </Text>
                    </Box>
                  </Box>
                )}
              </VStack>
            )}
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default DocumentManager;