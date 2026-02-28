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
import { FiMoreHorizontal, FiEdit2, FiTrash2, FiMessageSquare, FiChevronLeft, FiEdit3 } from 'react-icons/fi';
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
  documentRefreshTrigger?: number;
  showDocuments?: boolean;
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
  showDocuments = true,
}) => {
  const [chats, setChats] = useState<Chat[]>([]);
  const [, setIsLoading] = useState(false);
  const [editingChat, setEditingChat] = useState<Chat | null>(null);
  const [newTitle, setNewTitle] = useState('');

  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();

  const bgColor = useColorModeValue('rgba(255,255,255,0.5)', 'rgba(15, 15, 18, 0.6)');
  const borderColor = useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.04)');
  const textColor = useColorModeValue('surface.800', 'surface.200');
  const subtleColor = useColorModeValue('surface.500', 'surface.500');
  const hoverBg = useColorModeValue('rgba(245, 158, 11, 0.06)', 'rgba(245, 158, 11, 0.06)');
  const activeBg = useColorModeValue('rgba(245, 158, 11, 0.1)', 'rgba(245, 158, 11, 0.1)');
  const activeBorder = useColorModeValue('brand.400', 'brand.500');
  const newChatBg = useColorModeValue('surface.100', 'whiteAlpha.50');
  const newChatHoverBg = useColorModeValue('surface.200', 'whiteAlpha.100');
  const newChatHoverBorder = useColorModeValue('surface.300', 'whiteAlpha.200');
  const ghostHoverBg = useColorModeValue('surface.100', 'whiteAlpha.50');
  const moreHoverBg = useColorModeValue('surface.200', 'whiteAlpha.100');
  const menuListBg = useColorModeValue('white', 'surface.900');
  const menuListBorder = useColorModeValue('surface.200', 'whiteAlpha.50');
  const menuItemHover = useColorModeValue('surface.50', 'whiteAlpha.50');
  const menuRedHover = useColorModeValue('red.50', 'rgba(239,68,68,0.1)');

  const loadChats = async () => {
    try {
      setIsLoading(true);
      const response = await chatAPI.listChats();
      const data: any = response.data;
      const items: Chat[] = Array.isArray(data)
        ? data
        : Array.isArray(data?.chats)
        ? data.chats
        : [];
      setChats(items);
    } catch (error) {
      toast({ title: 'Failed to load chats', status: 'error', duration: 3000 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (refreshTrigger > 0) {
      setTimeout(() => loadChats(), 200);
    }
  }, [refreshTrigger]);

  const handleNewChat = async () => {
    try {
      const response = await chatAPI.createChat({ title: 'New Chat' });
      const newChat = response.data;
      setChats([newChat, ...chats]);
      onNewChat();
      onChatSelect(newChat.id);
    } catch (error) {
      toast({ title: 'Failed to create new chat', status: 'error', duration: 3000 });
    }
  };

  const handleRenameChat = async () => {
    if (!editingChat || !newTitle.trim()) return;
    try {
      await chatAPI.renameChat(editingChat.id, { title: newTitle.trim() });
      setChats(
        chats.map((chat) =>
          chat.id === editingChat.id ? { ...chat, title: newTitle.trim() } : chat
        )
      );
      toast({ title: 'Chat renamed', status: 'success', duration: 2000 });
      onClose();
      setEditingChat(null);
      setNewTitle('');
    } catch (error) {
      toast({ title: 'Failed to rename chat', status: 'error', duration: 3000 });
    }
  };

  const handleDeleteChat = async (chatId: number) => {
    try {
      await chatAPI.deleteChat(chatId);
      setChats(chats.filter((chat) => chat.id !== chatId));
      if (currentChatId === chatId) onNewChat();
      toast({ title: 'Chat deleted', status: 'success', duration: 2000 });
    } catch (error) {
      toast({ title: 'Failed to delete chat', status: 'error', duration: 3000 });
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
        backdropFilter="blur(20px) saturate(1.2)"
        borderRight="1px solid"
        borderColor={borderColor}
        position="relative"
        overflow="hidden"
        initial={false}
        animate={{ width: isCollapsed ? '72px' : '280px' }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
        display="flex"
        flexDirection="column"
      >
        {/* Header */}
        <Box p={isCollapsed ? 2 : 3} borderBottom="1px solid" borderColor={borderColor} flexShrink={0}>
          <VStack spacing={2} align="stretch">
            <Button
              leftIcon={!isCollapsed ? <FiEdit3 size={14} /> : undefined}
              onClick={handleNewChat}
              variant="unstyled"
              display="flex"
              alignItems="center"
              justifyContent="center"
              size={isCollapsed ? 'sm' : 'md'}
              w="full"
              h={isCollapsed ? 9 : 10}
              rounded="xl"
              bg={newChatBg}
              color={textColor}
              border="1px solid"
              borderColor={borderColor}
              fontSize="sm"
              fontWeight="600"
              _hover={{
                bg: newChatHoverBg,
                borderColor: newChatHoverBorder,
              }}
              transition="all 0.2s"
            >
              {isCollapsed ? <FiEdit3 size={14} /> : 'New chat'}
            </Button>

            {isCollapsed && (
              <Tooltip label="Expand" placement="right" hasArrow>
                <IconButton
                  aria-label="Expand sidebar"
                  icon={<FiChevronLeft style={{ transform: 'rotate(180deg)' }} />}
                  onClick={onToggle}
                  variant="ghost"
                  size="sm"
                  w="full"
                  color={subtleColor}
                  _hover={{ color: 'brand.500', bg: ghostHoverBg }}
                />
              </Tooltip>
            )}

            {!isCollapsed && (
              <HStack justify="space-between" align="center" px={1}>
                <Text fontSize="xs" fontWeight="600" color={subtleColor} textTransform="uppercase" letterSpacing="0.08em">
                  Chats
                </Text>
                <IconButton
                  aria-label="Collapse"
                  icon={<FiChevronLeft size={14} />}
                  onClick={onToggle}
                  variant="ghost"
                  size="xs"
                  color={subtleColor}
                  _hover={{ color: textColor }}
                />
              </HStack>
            )}
          </VStack>
        </Box>

        {/* Chat List */}
        <Box flex={1} overflowY="auto" overflowX="hidden" className="hide-scrollbar" p={isCollapsed ? 1 : 2}>
          <VStack spacing={0.5} align="stretch">
            <AnimatePresence>
              {(Array.isArray(chats) ? chats : []).map((chat, index) => (
                <MotionBox
                  key={chat.id}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.25, delay: index * 0.03 }}
                  role="group"
                >
                  <HStack
                    p={isCollapsed ? 2 : 2.5}
                    rounded="lg"
                    cursor="pointer"
                    bg={currentChatId === chat.id ? activeBg : 'transparent'}
                    _hover={{ bg: currentChatId === chat.id ? activeBg : hoverBg }}
                    onClick={() => onChatSelect(chat.id)}
                    justify={isCollapsed ? 'center' : 'space-between'}
                    transition="all 0.15s"
                    borderLeft="2px solid"
                    borderColor={currentChatId === chat.id ? activeBorder : 'transparent'}
                  >
                    {isCollapsed ? (
                      <Tooltip label={chat.title} placement="right" hasArrow>
                        <Box color={currentChatId === chat.id ? 'brand.500' : subtleColor}>
                          <FiMessageSquare size={16} />
                        </Box>
                      </Tooltip>
                    ) : (
                      <>
                        <HStack flex={1} minW={0} spacing={2.5}>
                          <Box color={currentChatId === chat.id ? 'brand.500' : subtleColor} flexShrink={0}>
                            <FiMessageSquare size={14} />
                          </Box>
                          <Text
                            fontSize="sm"
                            noOfLines={1}
                            flex={1}
                            fontWeight={currentChatId === chat.id ? '600' : '400'}
                            color={currentChatId === chat.id ? textColor : subtleColor}
                          >
                            {chat.title}
                          </Text>
                        </HStack>

                        <Menu>
                          <MenuButton
                            as={IconButton}
                            icon={<FiMoreHorizontal size={14} />}
                            size="xs"
                            variant="ghost"
                            rounded="md"
                            onClick={(e) => e.stopPropagation()}
                            opacity={0}
                            _groupHover={{ opacity: 0.7 }}
                            color={subtleColor}
                            _hover={{ color: textColor, bg: moreHoverBg }}
                          />
                          <MenuList
                            bg={menuListBg}
                            borderColor={menuListBorder}
                            shadow="lg"
                            rounded="xl"
                            py={1}
                            minW="140px"
                          >
                            <MenuItem
                              icon={<FiEdit2 size={13} />}
                              onClick={() => openRenameModal(chat)}
                              fontSize="sm"
                              py={2}
                              _hover={{ bg: menuItemHover }}
                            >
                              Rename
                            </MenuItem>
                            <MenuItem
                              icon={<FiTrash2 size={13} />}
                              onClick={() => handleDeleteChat(chat.id)}
                              color="red.400"
                              fontSize="sm"
                              py={2}
                              _hover={{ bg: menuRedHover }}
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

        {/* Document Management */}
        {!isCollapsed && showDocuments && (
          <Box borderTop="1px solid" borderColor={borderColor} p={3} flexShrink={0}>
            <DocumentManager
              isCollapsed={isCollapsed}
              selectedDocuments={selectedDocuments}
              onDocumentSelectionChange={onDocumentSelectionChange}
              showSelection={true}
              refreshTrigger={documentRefreshTrigger}
            />
          </Box>
        )}

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

      {/* Rename Modal */}
      <Modal isOpen={isOpen} onClose={onClose}>
        <ModalOverlay />
        <ModalContent rounded="2xl">
          <ModalHeader fontFamily="heading" fontWeight="700" fontSize="lg">
            Rename Chat
          </ModalHeader>
          <ModalBody>
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Enter new title"
              rounded="xl"
              onKeyPress={(e) => e.key === 'Enter' && handleRenameChat()}
            />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onClose} rounded="xl" size="sm">
              Cancel
            </Button>
            <Button
              bg="brand.500"
              color="surface.950"
              onClick={handleRenameChat}
              rounded="xl"
              size="sm"
              fontWeight="600"
              _hover={{ bg: 'brand.400' }}
            >
              Save
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </>
  );
};

export default Sidebar;
