import React, { useState, useEffect } from 'react';
import {
  Box,
  VStack,
  HStack,
  Button,
  Text,
  IconButton,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  useColorModeValue,
  useToast,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Tooltip,
} from '@chakra-ui/react';
import { FiPlus, FiMoreHorizontal, FiEdit2, FiTrash2, FiMessageSquare, FiChevronLeft, FiSearch, FiEdit3 } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { chatAPI } from '../../lib/api';
import DocumentManager from '../common/DocumentManager';

const MotionBox = motion(Box);

interface Chat {
  id: number;
  title: string;
  created_at: string;
  updated_at: string;
}

interface SidebarProps {
  currentChatId?: number;
  onChatSelect: (chatId: number) => void;
  onNewChat: () => void;
  isCollapsed?: boolean;
  onToggle?: () => void;
  refreshTrigger?: number;
  selectedDocuments?: number[];
  onDocumentSelectionChange?: (documentIds: number[]) => void;
  documentRefreshTrigger?: number; // Add document refresh trigger
  showDocuments?: boolean; // Add prop to control document display
}

const Sidebar: React.FC<SidebarProps> = ({ 
  currentChatId, 
  onChatSelect, 
  onNewChat, 
  isCollapsed = false,
  onToggle,
  refreshTrigger = 0,
  selectedDocuments = [],
  onDocumentSelectionChange,
  documentRefreshTrigger = 0,
  showDocuments = true
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingChat, setEditingChat] = useState<Chat | null>(null);
  const [newTitle, setNewTitle] = useState('');
  
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const bgColor = useColorModeValue('glass-bg', 'glass-bg');
  const borderColor = useColorModeValue('glass-border', 'glass-border');
  const hoverBg = useColorModeValue('rgba(249, 115, 22, 0.05)', 'rgba(249, 115, 22, 0.1)');
  const activeBg = useColorModeValue('rgba(249, 115, 22, 0.1)', 'rgba(249, 115, 22, 0.15)');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const iconBg = useColorModeValue('gray.100', 'gray.700');
  const menuHoverBg = useColorModeValue('gray.200', 'gray.600');
  const menuListBg = useColorModeValue('white', 'gray.800');
  const menuListBorder = useColorModeValue('gray.200', 'gray.600');
  const menuItemHoverBg = useColorModeValue('gray.50', 'gray.700');
  const deleteItemHoverBg = useColorModeValue('red.50', 'red.900');
  
  // Color definitions for maximize button
  const newChatButtonBg = useColorModeValue('gray.100', 'gray.700');
  const newChatButtonHoverBg = useColorModeValue('gray.200', 'gray.600');
  const maximizeButtonBg = useColorModeValue('gray.200', 'gray.600');
  const maximizeButtonHoverBg = useColorModeValue('brand.100', 'brand.700');

  const loadChats = async () => {
    try {
      setIsLoading(true);
      const response = await chatAPI.listChats();
      setChats(response.data);
    } catch (error) {
      toast({
        title: 'Failed to load chats',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  // Add effect to reload chats when refresh trigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      console.log('Refreshing sidebar due to refresh trigger:', refreshTrigger);
      // Reduced delay for faster title updates
      setTimeout(() => {
        loadChats();
      }, 200);
    }
  }, [refreshTrigger]);

  const handleNewChat = async (initialMessage?: string) => {
    try {
      // Create new chat with default title - backend will handle smart titles when first message is sent
      const response = await chatAPI.createChat({ title: 'New Chat' });
      const newChat = response.data;
      setChats([newChat, ...chats]);
      onNewChat();
      onChatSelect(newChat.id);
    } catch (error) {
      toast({
        title: 'Failed to create new chat',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleRenameChat = async () => {
    if (!editingChat || !newTitle.trim()) return;
    
    try {
      await chatAPI.renameChat(editingChat.id, { title: newTitle.trim() });
      setChats(chats.map(chat => 
        chat.id === editingChat.id 
          ? { ...chat, title: newTitle.trim() }
          : chat
      ));
      toast({
        title: 'Chat renamed',
        status: 'success',
        duration: 2000,
      });
      onClose();
      setEditingChat(null);
      setNewTitle('');
    } catch (error) {
      toast({
        title: 'Failed to rename chat',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await chatAPI.deleteChat(chatId);
      setChats(chats.filter(chat => chat.id !== chatId));
      if (currentChatId === chatId) {
        onNewChat();
      }
      toast({
        title: 'Chat deleted',
        status: 'success',
        duration: 2000,
      });
    } catch (error) {
      toast({
        title: 'Failed to delete chat',
        status: 'error',
        duration: 3000,
      });
    }
  };



  const openRenameModal = (chat: Chat) => {
    setEditingChat(chat);
    setNewTitle(chat.title);
    onOpen();
  };

  return (
    <>
      <MotionBox
        h="100%"
        bg={bgColor}
        backdropFilter="blur(20px)"
        borderRight="1px solid"
        borderColor={borderColor}
        shadow="glass"
        position="relative"
        overflow="hidden"
        initial={false}
        animate={{
          width: isCollapsed ? '80px' : '320px',
        }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        display="flex"
        flexDirection="column"
      >
        {/* Top Header Section - Fixed */}
        <Box 
          p={isCollapsed ? 2 : 4} 
          borderBottom="1px solid" 
          borderColor={borderColor}
          flexShrink={0}
          bg={bgColor}
          backdropFilter="blur(20px)"
        >
            <VStack spacing={3} align="stretch">
              {/* New Chat Button */}
              <MotionBox
                whileHover={{ scale: isCollapsed ? 1.05 : 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Button
                  leftIcon={!isCollapsed ? <FiEdit3 /> : undefined}
                  onClick={() => handleNewChat()}
                  variant="solid"
                  size={isCollapsed ? 'sm' : 'md'}
                  w="full"
                  rounded="xl"
                  bg={newChatButtonBg}
                  color={textColor}
                  border="1px solid"
                  borderColor={borderColor}
                  _hover={{
                    bg: newChatButtonHoverBg,
                    transform: "translateY(-1px)",
                    shadow: "md",
                  }}
                  _active={{
                    transform: "translateY(0)",
                  }}
                  transition="all 0.2s cubic-bezier(0.4, 0, 0.2, 1)"
                  fontWeight="medium"
                  shadow="sm"
                  px={isCollapsed ? 0 : 4}
                >
                  {isCollapsed ? <FiEdit3 /> : 'New chat'}
                </Button>
              </MotionBox>
              
              {/* Maximize Button - Only visible when collapsed */}
              {isCollapsed && (
                <>
                  {/* Small separator */}
                  <Box h={2} />
                  
                  <MotionBox
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    <Tooltip 
                      label="Expand sidebar" 
                      placement="right"
                      hasArrow
                      bg="gray.800"
                      color="white"
                      fontSize="sm"
                    >
                      <IconButton
                        aria-label="Expand sidebar"
                        icon={<FiChevronLeft style={{ transform: 'rotate(180deg)' }} />}
                        onClick={onToggle}
                        variant="solid"
                        size="sm"
                        w="full"
                        h={10}
                        rounded="lg"
                        bg={maximizeButtonBg}
                        color={textColor}
                        border="1px solid"
                        borderColor={borderColor}
                        _hover={{
                          bg: maximizeButtonHoverBg,
                          color: 'brand.500',
                          borderColor: 'brand.300',
                          transform: 'translateX(2px)',
                          shadow: 'md',
                        }}
                        _active={{
                          transform: 'translateX(0)',
                        }}
                        transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                        shadow="sm"
                      />
                    </Tooltip>
                  </MotionBox>
                </>
              )}
              
              {/* Collapse Toggle - Only visible when expanded */}
              {!isCollapsed && (
                <HStack justify="space-between" align="center">
                  <Text 
                    fontSize="sm" 
                    fontWeight="semibold" 
                    color={subtleColor}
                    letterSpacing="tight"
                  >
                    Recent
                  </Text>
                  
                  <IconButton
                    aria-label={isCollapsed ? 'Expand' : 'Collapse'}
                    icon={<FiChevronLeft />}
                    onClick={onToggle}
                    variant="ghost"
                    size="xs"
                    transform={isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)'}
                    transition="all 0.3s"
                    _hover={{
                      bg: hoverBg,
                      transform: isCollapsed ? 'rotate(180deg) scale(1.1)' : 'scale(1.1)',
                    }}
                  />
                </HStack>
              )}
            </VStack>
          </Box>
          
          {/* Chat List Section - Scrollable */}
          <Box 
            flex={1} 
            overflowY="auto" 
            overflowX="hidden"
            className="hide-scrollbar"
            minH={0}
            p={isCollapsed ? 1 : 3}
          >
            <VStack spacing={1} align="stretch">
              <AnimatePresence>
                {chats.map((chat, index) => (
                  <MotionBox
                    key={chat.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3, delay: index * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <HStack
                      p={isCollapsed ? 2 : 3}
                      rounded="xl"
                      cursor="pointer"
                      bg={currentChatId === chat.id ? activeBg : 'transparent'}
                      _hover={{ 
                        bg: currentChatId === chat.id ? activeBg : hoverBg,
                      }}
                      onClick={() => onChatSelect(chat.id)}
                      justify={isCollapsed ? "center" : "space-between"}
                      transition="all 0.2s"
                      border="1px solid"
                      borderColor={currentChatId === chat.id ? "brand.500" : "transparent"}
                      shadow={currentChatId === chat.id ? "md" : "none"}
                    >
                      {isCollapsed ? (
                        <Tooltip 
                          label={chat.title} 
                          placement="right"
                          hasArrow
                          bg="gray.800"
                          color="white"
                          fontSize="sm"
                        >
                          <Box
                            p={1.5}
                            rounded="lg"
                            bg={currentChatId === chat.id ? "brand.500" : iconBg}
                            color={currentChatId === chat.id ? "white" : subtleColor}
                            cursor="pointer"
                          >
                            <FiMessageSquare size={16} />
                          </Box>
                        </Tooltip>
                      ) : (
                        <>
                          <HStack flex={1} minW={0} spacing={3}>
                            <Box
                              p={1.5}
                              rounded="lg"
                              bg={currentChatId === chat.id ? "brand.500" : iconBg}
                              color={currentChatId === chat.id ? "white" : subtleColor}
                            >
                              <FiMessageSquare size={14} />
                            </Box>
                            <Text 
                              fontSize="sm" 
                              noOfLines={1} 
                              flex={1}
                              fontWeight={currentChatId === chat.id ? "semibold" : "normal"}
                              color={currentChatId === chat.id ? textColor : subtleColor}
                            >
                              {chat.title}
                            </Text>
                          </HStack>
                          
                          <Menu>
                            <MenuButton
                              as={IconButton}
                              icon={<FiMoreHorizontal />}
                              size="xs"
                              variant="ghost"
                              rounded="full"
                              onClick={(e) => e.stopPropagation()}
                              opacity={0.7}
                              _hover={{ opacity: 1, bg: menuHoverBg }}
                              transition="all 0.2s"
                            />
                            <MenuList bg={menuListBg} borderColor={menuListBorder} shadow="xl" rounded="xl">
                              <MenuItem 
                                icon={<FiEdit2 />} 
                                onClick={() => openRenameModal(chat)}
                                _hover={{ bg: menuItemHoverBg }}
                              >
                                Rename
                              </MenuItem>
                              <MenuItem
                                icon={<FiTrash2 />}
                                onClick={() => handleDeleteChat(chat.id)}
                                color="red.500"
                                _hover={{ bg: deleteItemHoverBg }}
                              >
                                Delete
                              </MenuItem>
                            </MenuList>
                          </Menu>
                        </>
                      )}
                    </HStack>
                  </MotionBox>
                ))}
              </AnimatePresence>
            </VStack>
          </Box>
          
          {/* Document Management Section */}
          {!isCollapsed && showDocuments && (
            <Box 
              borderTop="1px solid" 
              borderColor={borderColor}
              p={3}
              flexShrink={0}
            >
              <DocumentManager 
                isCollapsed={isCollapsed}
                selectedDocuments={selectedDocuments}
                onDocumentSelectionChange={onDocumentSelectionChange}
                showSelection={true}
                refreshTrigger={documentRefreshTrigger}
              />
            </Box>
          )}
          
          {/* Collapsed Document Manager */}
          {isCollapsed && showDocuments && (
            <Box p={1} flexShrink={0}>
              <DocumentManager 
                isCollapsed={isCollapsed}
                selectedDocuments={selectedDocuments}
                onDocumentSelectionChange={onDocumentSelectionChange}
                showSelection={false}
                refreshTrigger={documentRefreshTrigger}
              />
            </Box>
          )}
        </MotionBox>

      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Rename Chat</ModalHeader>
          <ModalBody>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title"
              onKeyPress={(e) => e.key === 'Enter' && handleRenameChat()}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose}>
              Cancel
            </Button>
            <Button colorScheme="blue" onClick={handleRenameChat}>
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Sidebar;
