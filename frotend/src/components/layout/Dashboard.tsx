import React, { useState } from 'react';
import { Box, Flex, useBreakpointValue, useColorModeValue } from '@chakra-ui/react';
import { motion } from 'framer-motion';
import Sidebar from './Sidebar';
import ChatArea from '../chat/ChatArea';
import Header from './Header';
import DocumentPanel from '../common/DocumentPanel';

const MotionBox = motion(Box);

const Dashboard: React.FC = () => {
  const [currentChatId, setCurrentChatId] = useState<number | undefined>();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isDocumentPanelCollapsed, setIsDocumentPanelCollapsed] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [documentRefreshTrigger, setDocumentRefreshTrigger] = useState(0);
  
  const isMobile = useBreakpointValue({ base: true, md: false });
  const bgGradient = useColorModeValue(
    'linear(135deg, gray.25 0%, gray.50 100%)',
    'linear(135deg, gray.950 0%, gray.900 100%)'
  );
  const documentPanelBorderColor = useColorModeValue('glass-border', 'glass-border');
  const documentPanelBg = useColorModeValue('glass-bg', 'glass-bg');

  const handleChatSelect = (chatId: number) => {
    setCurrentChatId(chatId);
  };

  const handleNewChat = () => {
    setCurrentChatId(undefined);
  };

  const handleChatCreated = (chatId: number) => {
    setCurrentChatId(chatId);
    setRefreshTrigger(prev => prev + 1); // Trigger sidebar refresh
  };

  const handleChatTitleUpdated = (chatId: number, title: string) => {
    // Trigger sidebar refresh when chat title is updated
    setRefreshTrigger(prev => prev + 1);
  };

  const handleSidebarToggle = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  const handleDocumentPanelToggle = () => {
    setIsDocumentPanelCollapsed(!isDocumentPanelCollapsed);
  };

  const handleDocumentSelectionChange = (documentIds: number[]) => {
    setSelectedDocuments(documentIds);
  };

  const handleDocumentUploaded = () => {
    setDocumentRefreshTrigger(prev => prev + 1);
  };

  return (
    <Flex direction="column" h="100vh" w="100vw" bg={bgGradient} overflow="hidden">
      {/* Header - Fixed at top */}
      <Box flexShrink={0}>
        <Header onSidebarToggle={handleSidebarToggle} />
      </Box>
      
      {/* Main content area - Three column layout */}
      <Flex flex={1} position="relative" overflow="hidden" minH={0}>
        {/* Left Sidebar - Chat List */}
        <MotionBox
          initial={false}
          animate={{
            width: isMobile ? (isSidebarCollapsed ? '0' : '100%') : (isSidebarCollapsed ? '80px' : '320px'),
            opacity: isMobile && isSidebarCollapsed ? 0 : 1,
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
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
            documentRefreshTrigger={documentRefreshTrigger}
            showDocuments={false} // Don't show documents in left sidebar anymore
          />
        </MotionBox>
        
        {/* Center - Chat Area */}
        <MotionBox
          flex={1}
          minWidth={0}
          initial={false}
          animate={{
            marginLeft: isMobile ? '0' : '0',
          }}
          transition={{ duration: 0.3, ease: 'easeInOut' }}
        >
          <ChatArea
            chatId={currentChatId}
            onChatCreated={handleChatCreated}
            onChatTitleUpdated={handleChatTitleUpdated}
            isSidebarCollapsed={isSidebarCollapsed}
            selectedDocuments={selectedDocuments}
            onDocumentSelectionChange={handleDocumentSelectionChange}
            onDocumentUploaded={handleDocumentUploaded}
            onDocumentPanelToggle={handleDocumentPanelToggle}
          />
        </MotionBox>

        {/* Right Sidebar - Document Panel */}
        {!isMobile && (
          <MotionBox
            initial={false}
            animate={{
              width: isDocumentPanelCollapsed ? '60px' : '320px',
              opacity: 1,
            }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            overflow="hidden"
            h="full"
            borderLeft="1px solid"
            borderColor={documentPanelBorderColor}
            bg={documentPanelBg}
            backdropFilter="blur(20px)"
          >
            <DocumentPanel
              isCollapsed={isDocumentPanelCollapsed}
              onToggle={handleDocumentPanelToggle}
              selectedDocuments={selectedDocuments}
              onDocumentSelectionChange={handleDocumentSelectionChange}
              refreshTrigger={documentRefreshTrigger}
            />
          </MotionBox>
        )}
      </Flex>
      
      {/* Mobile overlay */}
      {isMobile && !isSidebarCollapsed && (
        <MotionBox
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg="blackAlpha.600"
          backdropFilter="blur(4px)"
          zIndex={5}
          onClick={() => setIsSidebarCollapsed(true)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </Flex>
  );
};

export default Dashboard;
