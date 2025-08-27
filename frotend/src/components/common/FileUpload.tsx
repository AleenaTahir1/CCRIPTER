import React, { useState, useRef, useCallback } from 'react';
import {
  Box,
  Button,
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalCloseButton,
  VStack,
  HStack,
  Text,
  Icon,
  Badge,
  Progress,
  List,
  ListItem,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { motion } from 'framer-motion';
import {
  FiPaperclip,
  FiUpload,
  FiFileText,
  FiFile,
  FiImage,
  FiCheck,
  FiX,
} from 'react-icons/fi';
import { documentAPI } from '../../lib/api';
import { Document } from '../../types';

const MotionBox = motion(Box);

interface FileUploadProps {
  onFileUploaded?: (document: Document) => void;
  isDisabled?: boolean;
}

interface UploadingFile {
  id: string;
  file: File;
  progress: number;
  status: 'uploading' | 'completed' | 'error';
  extractedText?: string;
}

const supportedTypes = {
  '.pdf': { name: 'PDF', type: 'application/pdf' },
  '.docx': { name: 'DOCX', type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' },
  '.doc': { name: 'DOC', type: 'application/msword' },
  '.txt': { name: 'TXT', type: 'text/plain' },
  '.png': { name: 'PNG', type: 'image/png' },
  '.jpg': { name: 'JPG', type: 'image/jpeg' },
  '.jpeg': { name: 'JPEG', type: 'image/jpeg' },
  '.gif': { name: 'GIF', type: 'image/gif' },
  '.bmp': { name: 'BMP', type: 'image/bmp' },
  '.tiff': { name: 'TIFF', type: 'image/tiff' },
  '.tif': { name: 'TIF', type: 'image/tiff' },
};

const FileUpload: React.FC<FileUploadProps> = ({ onFileUploaded, isDisabled = false }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue('white', 'gray.800');
  const textColor = useColorModeValue('gray.900', 'white');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const borderColor = useColorModeValue('gray.200', 'gray.600');
  const dragBorderColor = useColorModeValue('brand.300', 'brand.600');
  const dragBgColor = useColorModeValue('brand.50', 'brand.900');

  const getFileIcon = (filename: string) => {
    const ext = '.' + filename.split('.').pop()?.toLowerCase();
    if (ext === '.pdf') {
      return { icon: FiFileText, color: 'red.500' };
    }
    if (['.doc', '.docx'].includes(ext)) {
      return { icon: FiFileText, color: 'blue.500' };
    }
    if (ext === '.txt') {
      return { icon: FiFileText, color: 'gray.500' };
    }
    if (['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.tiff', '.tif'].includes(ext)) {
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

  const validateFile = (file: File): string | null => {
    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return 'File size must be less than 10MB';
    }

    // Check file type
    const ext = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!supportedTypes[ext as keyof typeof supportedTypes]) {
      return 'File type not supported';
    }

    return null;
  };

  const handleFileSelect = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const error = validateFile(file);
      
      if (error) {
        toast({
          title: `Error uploading ${file.name}`,
          description: error,
          status: 'error',
          duration: 4000,
        });
      } else {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    // Create upload entries
    const newUploads: UploadingFile[] = validFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      file,
      progress: 0,
      status: 'uploading' as const,
    }));

    setUploadingFiles(prev => [...prev, ...newUploads]);

    // Upload files one by one
    for (const upload of newUploads) {
      try {
        const response = await documentAPI.uploadDocument(
          upload.file,
          (progress) => {
            setUploadingFiles(prev => 
              prev.map(u => 
                u.id === upload.id ? { ...u, progress } : u
              )
            );
          }
        );

        setUploadingFiles(prev => 
          prev.map(u => 
            u.id === upload.id 
              ? { 
                  ...u, 
                  status: 'completed' as const, 
                  progress: 100,
                  extractedText: response.data.extracted_text 
                } 
              : u
          )
        );

        toast({
          title: 'Upload successful',
          description: `${upload.file.name} uploaded successfully`,
          status: 'success',
          duration: 3000,
        });

        // Notify parent component with document info
        onFileUploaded?.(response.data);

      } catch (error) {
        console.error('Upload failed:', error);
        setUploadingFiles(prev => 
          prev.map(u => 
            u.id === upload.id ? { ...u, status: 'error' as const } : u
          )
        );

        toast({
          title: 'Upload failed',
          description: `Failed to upload ${upload.file.name}`,
          status: 'error',
          duration: 4000,
        });
      }
    }

    // Clear file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [toast, onFileUploaded]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const removeUpload = (uploadId: string) => {
    setUploadingFiles(prev => prev.filter(upload => upload.id !== uploadId));
  };

  const clearCompleted = () => {
    setUploadingFiles(prev => prev.filter(upload => upload.status !== 'completed'));
  };

  return (
    <>
      <IconButton
        aria-label="Upload document"
        icon={<FiPaperclip />}
        onClick={() => setIsOpen(true)}
        variant="ghost"
        size="lg"
        disabled={isDisabled}
        color={subtleColor}
        rounded="xl"
        _hover={{
          bg: dragBgColor,
          color: "brand.500",
          transform: "scale(1.1)",
        }}
        transition="all 0.2s"
      />

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,.png,.jpg,.jpeg,.gif,.bmp,.tiff,.tif"
        onChange={(e) => handleFileSelect(e.target.files)}
        style={{ display: 'none' }}
      />

      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="xl">
        <ModalOverlay bg="blackAlpha.300" />
        <ModalContent bg={bgColor} rounded="2xl" mx={4}>
          <ModalHeader>
            <HStack>
              <Icon as={FiUpload} color="brand.500" />
              <Text>Upload Documents</Text>
            </HStack>
          </ModalHeader>
          <ModalCloseButton />
          <ModalBody pb={6}>
            <VStack spacing={6}>
              {/* Drag & Drop Area */}
              <MotionBox
                w="full"
                p={8}
                border="2px dashed"
                borderColor={isDragOver ? dragBorderColor : borderColor}
                bg={isDragOver ? dragBgColor : 'transparent'}
                rounded="xl"
                textAlign="center"
                cursor="pointer"
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                transition="all 0.2s"
              >
                <VStack spacing={4}>
                  <Icon as={FiUpload} w={10} h={10} color="brand.500" />
                  <VStack spacing={2}>
                    <Text fontSize="lg" fontWeight="semibold" color={textColor}>
                      {isDragOver ? 'Drop files here' : 'Drag & drop files here'}
                    </Text>
                    <Text color={subtleColor}>or click to browse</Text>
                  </VStack>
                  <Box>
                    <Text fontSize="sm" color={subtleColor} mb={2}>
                      Supported formats:
                    </Text>
                    <HStack spacing={2} justify="center" wrap="wrap">
                      {Object.entries(supportedTypes).map(([ext, info]) => (
                        <Badge key={ext} colorScheme="gray" variant="subtle">
                          {info.name}
                        </Badge>
                      ))}
                    </HStack>
                    <Text fontSize="xs" color={subtleColor} mt={2}>
                      Maximum file size: 10MB
                    </Text>
                  </Box>
                </VStack>
              </MotionBox>

              {/* Upload Progress */}
              {uploadingFiles.length > 0 && (
                <Box w="full">
                  <HStack justify="space-between" mb={3}>
                    <Text fontWeight="semibold">Upload Progress</Text>
                    {uploadingFiles.some(f => f.status === 'completed') && (
                      <Button size="sm" variant="ghost" onClick={clearCompleted}>
                        Clear Completed
                      </Button>
                    )}
                  </HStack>
                  <List spacing={3}>
                    {uploadingFiles.map((upload) => {
                      const fileInfo = getFileIcon(upload.file.name);
                      return (
                        <ListItem key={upload.id}>
                          <Box
                            p={4}
                            border="1px solid"
                            borderColor={borderColor}
                            rounded="lg"
                            bg={bgColor}
                          >
                            <HStack spacing={3}>
                              <Icon as={fileInfo.icon} color={fileInfo.color} w={5} h={5} />
                              <VStack flex={1} align="stretch" spacing={2}>
                                <HStack justify="space-between">
                                  <Text fontWeight="medium" noOfLines={1}>
                                    {upload.file.name}
                                  </Text>
                                  <IconButton
                                    aria-label="Remove"
                                    icon={<FiX />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => removeUpload(upload.id)}
                                  />
                                </HStack>
                                <HStack spacing={3}>
                                  <Text fontSize="sm" color={subtleColor}>
                                    {formatFileSize(upload.file.size)}
                                  </Text>
                                  {upload.status === 'completed' && (
                                    <HStack spacing={1}>
                                      <Icon as={FiCheck} color="green.500" w={4} h={4} />
                                      <Text fontSize="sm" color="green.500">Completed</Text>
                                    </HStack>
                                  )}
                                  {upload.status === 'error' && (
                                    <HStack spacing={1}>
                                      <Icon as={FiX} color="red.500" w={4} h={4} />
                                      <Text fontSize="sm" color="red.500">Failed</Text>
                                    </HStack>
                                  )}
                                </HStack>
                                {upload.status === 'uploading' && (
                                  <Progress
                                    value={upload.progress}
                                    colorScheme="brand"
                                    size="sm"
                                    rounded="full"
                                  />
                                )}
                                {upload.extractedText && (
                                  <Text fontSize="xs" color={subtleColor} noOfLines={2}>
                                    Text extracted: {upload.extractedText}
                                  </Text>
                                )}
                              </VStack>
                            </HStack>
                          </Box>
                        </ListItem>
                      );
                    })}
                  </List>
                </Box>
              )}
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default FileUpload;