import React, { useState } from 'react';
import { Box, Flex, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import ChatArea from '../chat/ChatArea';
import Header from './Header';

const MotionBox = motion(Box);

const Dashboard: React.FC = () => {
  const [currentChatId, setCurrentChatId] = useState<number | undefined>();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);

  const isMobile = useBreakpointValue({ base: true, md: false });

  const handleChatSelect = (chatId: number) => setCurrentChatId(chatId);
  const handleNewChat = () => setCurrentChatId(undefined);
  const handleChatCreated = (chatId: number) => {
    setCurrentChatId(chatId);
    setRefreshTrigger((prev) => prev + 1);
  };
  const handleChatTitleUpdated = () => setRefreshTrigger((prev) => prev + 1);
  const handleSidebarToggle = () => setIsSidebarCollapsed(!isSidebarCollapsed);
  const handleDocumentSelectionChange = (documentIds: number[]) => setSelectedDocuments(documentIds);

  return (
    <Flex
      direction="column"
      h="100vh"
      w="100vw"
      overflow="hidden"
      className={useColorModeValue('mesh-gradient-light', 'mesh-gradient-dark')}
    >
      {/* Header */}
      <Box flexShrink={0}>
        <Header onSidebarToggle={handleSidebarToggle} />
      </Box>

      {/* Main content */}
      <Flex flex={1} position="relative" overflow="hidden" minH={0}>
        {/* Sidebar */}
        <MotionBox
          initial={false}
          animate={{
            width: isMobile
              ? isSidebarCollapsed
                ? '0'
                : '100%'
              : isSidebarCollapsed
              ? '72px'
              : '280px',
            opacity: isMobile && isSidebarCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          overflow="hidden"
          position={isMobile ? 'absolute' : 'relative'}
          zIndex={isMobile ? 10 : 'auto'}
          h="full"
        >
          <Sidebar
            currentChatId={currentChatId}
            onChatSelect={handleChatSelect}
            onNewChat={handleNewChat}
            isCollapsed={isSidebarCollapsed}
            onToggle={handleSidebarToggle}
            refreshTrigger={refreshTrigger}
            selectedDocuments={selectedDocuments}
            onDocumentSelectionChange={handleDocumentSelectionChange}
            documentRefreshTrigger={0}
            showDocuments={false}
          />
        </MotionBox>

        {/* Chat Area */}
        <Box flex={1} minWidth={0}>
          <ChatArea
            chatId={currentChatId}
            onChatCreated={handleChatCreated}
            onChatTitleUpdated={handleChatTitleUpdated}
            isSidebarCollapsed={isSidebarCollapsed}
            selectedDocuments={selectedDocuments}
            onDocumentSelectionChange={handleDocumentSelectionChange}
          />
        </Box>
      </Flex>

      {/* Mobile overlay */}
      {isMobile && !isSidebarCollapsed && (
        <MotionBox
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.700"
          backdropFilter="blur(4px)"
          zIndex={5}
          onClick={() => setIsSidebarCollapsed(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        />
      )}
    </Flex>
  );
};

export default Dashboard;
