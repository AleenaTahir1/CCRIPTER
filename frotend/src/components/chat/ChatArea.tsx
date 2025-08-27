import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  VStack,
  HStack,
  Input,
  IconButton,
  Text,
  Flex,
  useColorModeValue,
  useToast,
  Spinner,
  Button,
  Progress,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
  Badge,
  Tooltip,
} from '@chakra-ui/react';
import { FiSend, FiMic, FiMicOff, FiVolume2, FiX, FiCheck, FiPause, FiFile, FiFolder } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { chatAPI, endpoints } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../common/FileUpload';
import UserAvatar from '../common/UserAvatar';
import { Document } from '../../types';

const MotionBox = motion(Box);
const MotionFlex = motion(Flex);

interface Message {
  id: number;
  user_id: string;
  chat_id?: number;
  timestamp: string;
  query: string;
  response: string;
  audioUrl?: string;
}

interface ChatAreaProps {
  chatId?: number;
  onChatCreated?: (chatId: number) => void;
  onChatTitleUpdated?: (chatId: number, title: string) => void;
  isSidebarCollapsed?: boolean;
  selectedDocuments?: number[];
  onDocumentSelectionChange?: (documentIds: number[]) => void;
  onDocumentUploaded?: () => void; // Add callback for document upload
  onDocumentPanelToggle?: () => void; // Add callback for document panel toggle
}

const ChatArea: React.FC<ChatAreaProps> = ({ 
  chatId, 
  onChatCreated, 
  onChatTitleUpdated, 
  isSidebarCollapsed = false,
  selectedDocuments = [],
  onDocumentSelectionChange,
  onDocumentUploaded,
  onDocumentPanelToggle
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [currentAudio, setCurrentAudio] = useState<HTMLAudioElement | null>(null);
  const [playingMessageId, setPlayingMessageId] = useState<number | null>(null);
  const [isAudioPaused, setIsAudioPaused] = useState(false);
  const [audioPosition, setAudioPosition] = useState(0);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const [audioCurrentTime, setAudioCurrentTime] = useState<number>(0);
  const recordingInterval = useRef<NodeJS.Timeout>();
  
  const { user } = useAuth();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOpen: isRecordingModalOpen, onOpen: onRecordingModalOpen, onClose: onRecordingModalClose } = useDisclosure();
  
  const bgColor = useColorModeValue('glass-bg', 'glass-bg');
  const chatBgColor = useColorModeValue('glass-bg', 'glass-bg');
  const borderColor = useColorModeValue('glass-border', 'glass-border');
  const userBg = useColorModeValue('linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)');
  const assistantBg = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(55, 65, 81, 0.9)');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const subtleColor = useColorModeValue('gray.600', 'gray.400');
  const inputBg = useColorModeValue('white', 'gray.800');
  const brandBg = useColorModeValue('brand.50', 'brand.900');
  const avatarBorder = useColorModeValue('white', 'gray.800');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (chatId) {
      // Stop any playing audio when switching to a different chat
      stopAllAudio();
      stopStreaming();
      loadChatMessages();
    } else {
      // Stop audio when creating new chat too
      stopAllAudio();
      stopStreaming();
      setMessages([]);
    }
  }, [chatId]);

  const loadChatMessages = async () => {
    if (!chatId) return;
    
    try {
      const response = await chatAPI.getChatMessages(chatId);
      setMessages(response.data.reverse()); // API returns newest first, we want oldest first
    } catch (error) {
      toast({
        title: 'Failed to load messages',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    // Stop any playing audio and streaming when starting new message
    stopAllAudio();
    stopStreaming();

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    try {
      let currentChatId = chatId;
      
      // If this is the first message (no chatId), let backend auto-create with smart title
      if (!currentChatId) {
        // Backend will handle smart title generation automatically
        // We'll get the chatId from the response
      }

      // Use document-aware chat if documents are selected
      let response;
      if (selectedDocuments.length > 0) {
        console.log('[DEBUG] Chatting with documents:', selectedDocuments);
        response = await chatAPI.chatWithDocument({
          query: userMessage,
          document_ids: selectedDocuments,
          chat_id: currentChatId,
        });
      } else {
        console.log('[DEBUG] Regular chat without documents');
        response = await chatAPI.sendMessage({
          query: userMessage,
          chat_id: currentChatId,
        });
      }

      // Get chatId from response (backend auto-creates chat if needed)
      const newChatId = response.data.chat_id;
      
      // Notify parent component about the new chat if it was created
      if (!currentChatId && newChatId && onChatCreated) {
        onChatCreated(newChatId);
      }
      
      // If this is the first message for an existing chat, trigger title update
      if (currentChatId && onChatTitleUpdated && messages.length === 0) {
        // Generate same title as backend would
        const words = userMessage.trim().split(/\s+/);
        const meaningfulWords = words.filter((word: string) => 
          word.length > 2 && 
          !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'do', 'does', 'did', 'am', 'be', 'been', 'being', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'we', 'us', 'our', 'ours', 'they', 'them', 'their', 'theirs'].includes(word.toLowerCase())
        );
        
        let titleWords;
        if (meaningfulWords.length >= 3) {
          titleWords = meaningfulWords.slice(0, 3);
        } else if (meaningfulWords.length >= 2) {
          titleWords = meaningfulWords.slice(0, 2);
        } else if (meaningfulWords.length > 0) {
          titleWords = meaningfulWords.slice(0, 1);
        } else {
          titleWords = words.slice(0, Math.min(3, words.length));
        }
        
        const smartTitle = titleWords.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        onChatTitleUpdated(currentChatId, smartTitle || 'New Chat');
      }

      const newMessage: Message = {
        id: response.data.message_id,
        user_id: response.data.user_id,
        chat_id: response.data.chat_id,
        timestamp: response.data.timestamp,
        query: response.data.query,
        response: response.data.response,
      };

      setMessages(prev => [...prev, newMessage]);

      // Start voice synthesis immediately in parallel with text display
      if (newMessage.response) {
        synthesizeText(newMessage.response, newMessage.id, true);
      }

    } catch (error: any) {
      toast({
        title: 'Failed to send message',
        description: error.response?.data?.detail || 'Something went wrong',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (e) => chunks.push(e.data);
      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: 'audio/wav' });
        onRecordingModalClose();
        await sendVoiceMessage(blob);
        stream.getTracks().forEach(track => track.stop());
        setRecordingTime(0);
        if (recordingInterval.current) {
          clearInterval(recordingInterval.current);
        }
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingModalOpen();

      // Start timer
      recordingInterval.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (error) {
      toast({
        title: 'Failed to start recording',
        description: 'Please allow microphone access',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stream.getTracks().forEach(track => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
      setRecordingTime(0);
      onRecordingModalClose();
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const formatAudioTime = (current: number, total: number) => {
    if (total === 0) return '';
    return `${formatTime(Math.floor(current))} / ${formatTime(Math.floor(total))}`;
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    }) + ' PKT';
  };



  const stopCurrentAudio = () => {
    if (currentAudio) {
      try {
        // Prevent race conditions by immediately setting states
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
        setAudioDuration(0);
        setAudioCurrentTime(0);
        
        // Then stop the audio
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (error) {
        // Ignore errors when stopping audio
        console.warn('Error stopping audio:', error);
      }
    }
  };

  const pauseCurrentAudio = () => {
    if (currentAudio && !currentAudio.paused) {
      try {
        setAudioPosition(currentAudio.currentTime);
        currentAudio.pause();
        setIsAudioPaused(true);
      } catch (error) {
        console.warn('Error pausing audio:', error);
        stopCurrentAudio();
      }
    }
  };

  const resumeCurrentAudio = async () => {
    if (currentAudio && currentAudio.paused && !isAudioLoading) {
      try {
        currentAudio.currentTime = audioPosition;
        await currentAudio.play();
        setIsAudioPaused(false);
      } catch (error) {
        console.warn('Error resuming audio:', error);
        stopCurrentAudio();
      }
    }
  };

  const synthesizeText = async (text: string, messageId: number, autoPlay: boolean = false) => {
    try {
      // Stop any currently playing audio
      stopCurrentAudio();
      setIsAudioLoading(true);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(endpoints.speak(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` }),
        },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`TTS failed (${response.status}): ${errorText}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      const audio = new Audio(audioUrl);
      
      // Optimize for immediate playback
      audio.preload = 'auto';
      
      // Set up event handlers before playing
      audio.onended = () => {
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
        URL.revokeObjectURL(audioUrl);
      };
      
      audio.onerror = (error) => {
        console.error('Audio error:', error);
        toast({
          title: 'Audio playback failed',
          description: 'Could not play the synthesized audio',
          status: 'error',
          duration: 3000,
        });
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
        URL.revokeObjectURL(audioUrl);
      };

      // Optimized loading and playback
      const playAudio = async () => {
        setIsAudioLoading(false);
        setAudioDuration(audio.duration || 0);
        
        // Set up time update listener
        audio.ontimeupdate = () => {
          setAudioCurrentTime(audio.currentTime);
        };
        
        if (autoPlay) {
          try {
            await audio.play();
            setCurrentAudio(audio);
            setPlayingMessageId(messageId);
            setIsAudioPaused(false);
          } catch (playError) {
            console.warn('Auto-play failed, setting up for manual play:', playError);
            setCurrentAudio(audio);
            setPlayingMessageId(messageId);
            setIsAudioPaused(true);
            toast({
              title: 'Click to play audio',
              description: 'Browser prevented auto-play. Click the voice button to play.',
              status: 'info',
              duration: 3000,
            });
          }
        } else {
          setCurrentAudio(audio);
          setPlayingMessageId(messageId);
          setIsAudioPaused(true);
        }
      };

      // Try immediate playback first, fallback to canplaythrough
      if (audio.readyState >= 3) {
        await playAudio();
      } else {
        audio.oncanplaythrough = playAudio;
        audio.load();
      }

    } catch (error: any) {
      console.error('TTS Error:', error);
      setIsAudioLoading(false);
      toast({
        title: 'Failed to generate speech',
        description: error.message || 'Voice synthesis is not available',
        status: 'error',
        duration: 4000,
      });
    }
  };

  const playMessageAudio = async (messageId: number, audioUrl: string, autoPlay: boolean = true) => {
    try {
      // Stop any currently playing audio
      stopCurrentAudio();
      setIsAudioLoading(true);

      const audio = new Audio(audioUrl);
      
      // Optimize for immediate playback
      audio.preload = 'auto';
      
      // Set up event handlers before playing
      audio.onended = () => {
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
      };
      
      audio.onerror = () => {
        toast({
          title: 'Audio playback failed',
          status: 'error',
          duration: 2000,
        });
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
      };

      // Optimized loading and playback
      const playAudio = async () => {
        setIsAudioLoading(false);
        setAudioDuration(audio.duration || 0);
        
        // Set up time update listener
        audio.ontimeupdate = () => {
          setAudioCurrentTime(audio.currentTime);
        };
        
        if (autoPlay) {
          try {
            await audio.play();
            setCurrentAudio(audio);
            setPlayingMessageId(messageId);
            setIsAudioPaused(false);
          } catch (playError) {
            console.warn('Auto-play failed:', playError);
            setCurrentAudio(audio);
            setPlayingMessageId(messageId);
            setIsAudioPaused(true);
          }
        } else {
          setCurrentAudio(audio);
          setPlayingMessageId(messageId);
          setIsAudioPaused(true);
        }
      };

      // Try immediate playback first, fallback to canplaythrough
      if (audio.readyState >= 3) {
        await playAudio();
      } else {
        audio.oncanplaythrough = playAudio;
        audio.load();
      }

      return audio;
    } catch (error) {
      setIsAudioLoading(false);
      toast({
        title: 'Audio setup failed',
        status: 'error',
        duration: 2000,
      });
    }
  };

  const pauseMessageAudio = async () => {
    if (currentAudio && !isAudioLoading) {
      if (currentAudio.paused) {
        await resumeCurrentAudio();
      } else {
        pauseCurrentAudio();
      }
    }
  };

  const sendVoiceMessage = async (audioBlob: Blob) => {
    setIsLoading(true);

    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'audio.wav');

      const response = await chatAPI.sendVoiceMessage(formData, chatId);

      const audioUrl = response.data.audio_b64 
        ? `data:audio/wav;base64,${response.data.audio_b64}`
        : undefined;

      const newMessage: Message = {
        id: response.data.message_id,
        user_id: response.data.user_id,
        chat_id: response.data.chat_id,
        timestamp: response.data.timestamp,
        query: response.data.transcript,
        response: response.data.response,
        audioUrl,
      };

      setMessages(prev => [...prev, newMessage]);

      // Start voice playback immediately in parallel with text display
      if (audioUrl) {
        playMessageAudio(response.data.message_id, audioUrl, true);
      }

      // If this created a new chat
      if (!chatId && response.data.chat_id && onChatCreated) {
        onChatCreated(response.data.chat_id);
      }
      
      // If this is the first message for an existing chat, trigger title update for voice message
      if (chatId && onChatTitleUpdated && messages.length === 0) {
        const transcript = response.data.transcript || '';
        const words = transcript.trim().split(/\s+/);
        const meaningfulWords = words.filter((word: string) => 
          word.length > 2 && 
          !['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'can', 'may', 'might', 'do', 'does', 'did', 'am', 'be', 'been', 'being', 'a', 'an', 'this', 'that', 'these', 'those', 'i', 'me', 'my', 'mine', 'you', 'your', 'yours', 'he', 'him', 'his', 'she', 'her', 'hers', 'it', 'its', 'we', 'us', 'our', 'ours', 'they', 'them', 'their', 'theirs'].includes(word.toLowerCase())
        );
        
        let titleWords;
        if (meaningfulWords.length >= 3) {
          titleWords = meaningfulWords.slice(0, 3);
        } else if (meaningfulWords.length >= 2) {
          titleWords = meaningfulWords.slice(0, 2);
        } else if (meaningfulWords.length > 0) {
          titleWords = meaningfulWords.slice(0, 1);
        } else {
          titleWords = words.slice(0, Math.min(3, words.length));
        }
        
        const smartTitle = titleWords.map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
        onChatTitleUpdated(chatId, smartTitle || 'New Chat');
      }
    } catch (error: any) {
      toast({
        title: 'Failed to send voice message',
        description: error.response?.data?.detail || 'Something went wrong',
        status: 'error',
        duration: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Stop audio when user starts typing or recording
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Immediately stop all audio when user starts interacting
    stopAllAudio();
    stopStreaming();
    setInputValue(e.target.value);
  };

  const handleInputFocus = () => {
    // Stop voice immediately when user focuses on input
    stopAllAudio();
    stopStreaming();
  };

  const handleVoiceButtonClick = async () => {
    // Stop any playing voice immediately when clicking voice button
    stopAllAudio();
    stopStreaming();
    await startRecording();
  };

  // Comprehensive audio stopping functions
  const stopAllAudio = () => {
    if (currentAudio) {
      try {
        // Immediately pause and reset
        currentAudio.pause();
        currentAudio.currentTime = 0;
        // Remove event listeners to prevent conflicts
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.ontimeupdate = null;
        currentAudio.oncanplaythrough = null;
      } catch (error) {
        // Ignore errors when stopping audio
        console.warn('Error stopping audio:', error);
      }
      setCurrentAudio(null);
    }
    
    // Reset all audio-related states
    setPlayingMessageId(null);
    setIsAudioPaused(false);
    setAudioPosition(0);
    setIsAudioLoading(false);
    setAudioDuration(0);
    setAudioCurrentTime(0);
  };

  const stopStreaming = () => {
    // Stop any ongoing streaming if applicable
    // This function matches Chat.tsx pattern for consistency
  };

  const handleStartRecording = async () => {
    // Stop any playing audio and streaming when starting to record (like Chat.tsx)
    stopAllAudio();
    stopStreaming();
    await startRecording();
  };

  return (
    <>
      <MotionFlex 
        direction="column" 
        h="100%" 
        maxH="100%"
        bg="transparent"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        overflow="hidden"
      >
        {/* Messages Area */}
        <MotionBox 
          flex={1} 
          overflowY="auto" 
          px={{ base: 4, md: 8 }} 
          py={6}
          className="hide-scrollbar"
          position="relative"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <VStack spacing={6} align="stretch" w="full">
            {messages.length === 0 && !isLoading && (
              <VStack spacing={6} py={20} align="center">
                <MotionBox
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.2, type: 'spring' }}
                >
                  <HStack spacing={3}>
                    <Box
                      w={16}
                      h={16}
                      bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                      rounded="2xl"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      shadow="xl"
                      className="floating"
                      position="relative"
                      _before={{
                        content: '""',
                        position: 'absolute',
                        inset: '-2px',
                        rounded: '2xl',
                        p: '2px',
                        bgGradient: 'linear(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'subtract',
                      }}
                    >
                      <Text color="white" fontWeight="black" fontSize="2xl">
                        CC
                      </Text>
                    </Box>
                  </HStack>
                </MotionBox>
                
                <MotionBox
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, delay: 0.4 }}
                  maxW="600px"
                >
                  <Box
                    bg={assistantBg}
                    backdropFilter="blur(20px)"
                    p={8}
                    rounded="3xl"
                    border="1px solid"
                    borderColor={borderColor}
                    position="relative"
                    shadow="glass"
                    _hover={{ shadow: "glow" }}
                    transition="all 0.3s"
                  >
                    <Text 
                      fontSize="lg" 
                      lineHeight="1.7"
                      color={textColor}
                      textAlign="center"
                      fontWeight="medium"
                    >
                      Hello! I'm your <span className="gradient-text">CCRIPTER</span> assistant. 
                      I can help you with questions, conversations, and voice interactions. 
                      Ask me anything!
                    </Text>
                  </Box>
                </MotionBox>
              </VStack>
            )}

            {messages.map((message) => (
              <VStack key={message.id} spacing={4} align="stretch" w="full">
                {/* User Message */}
                <MotionBox
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <HStack justify="flex-end" spacing={3} w="full">
                    <VStack align="flex-end" spacing={2} maxW="70%">
                      <Box
                        bg={userBg}
                        color="white"
                        p={5}
                        rounded="3xl"
                        roundedBottomRight="lg"
                        w="fit-content"
                        ml="auto"
                        shadow="xl"
                        position="relative"
                        _hover={{ shadow: "glow", transform: "translateY(-1px)" }}
                        transition="all 0.3s"
                        backdropFilter="blur(10px)"
                        border="1px solid rgba(255,255,255,0.2)"
                      >
                        <Text fontWeight="medium" lineHeight="1.5">{message.query}</Text>
                      </Box>
                      <Text fontSize="xs" color={subtleColor} mr={2}>
                        {formatMessageTime(message.timestamp)}
                      </Text>
                    </VStack>
                    <UserAvatar 
                      size="md" 
                      name={user?.name} 
                      profilePicture={user?.profile_picture}
                      borderColor={avatarBorder}
                      shadow="lg"
                    />
                  </HStack>
                </MotionBox>

                {/* Assistant Message */}
                <MotionBox
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                >
                  <HStack justify="flex-start" spacing={3} align="flex-start" w="full">
                    <Box
                      w={12}
                      h={12}
                      bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                      rounded="xl"
                      display="flex"
                      alignItems="center"
                      justifyContent="center"
                      flexShrink={0}
                      shadow="lg"
                      border="2px solid"
                      borderColor={avatarBorder}
                      position="relative"
                      _before={{
                        content: '""',
                        position: 'absolute',
                        inset: '-1px',
                        rounded: 'xl',
                        p: '1px',
                        bgGradient: 'linear(135deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.1) 100%)',
                        mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                        maskComposite: 'subtract',
                      }}
                    >
                      <Text color="white" fontWeight="black" fontSize="lg">
                        CC
                      </Text>
                    </Box>
                    
                    <VStack align="flex-start" spacing={2} maxW="70%" flex={1}>
                      <Box
                        bg={assistantBg}
                        backdropFilter="blur(20px)"
                        p={6}
                        rounded="3xl"
                        roundedTopLeft="lg"
                        w="fit-content"
                        border="1px solid"
                        borderColor={borderColor}
                        shadow="glass"
                        _hover={{ shadow: "glow", transform: "translateY(-1px)" }}
                        transition="all 0.3s"
                        position="relative"
                      >
                        <Text 
                          whiteSpace="pre-wrap" 
                          lineHeight="1.6"
                          color={textColor}
                          fontWeight="medium"
                        >
                          {message.response}
                        </Text>
                      </Box>
                      
                      <HStack spacing={3} pl={2}>
                        {/* Voice output button for all assistant messages */}
                        <IconButton
                          aria-label={
                            isAudioLoading && playingMessageId === message.id
                              ? "Loading audio..."
                              : playingMessageId === message.id 
                                ? (isAudioPaused ? "Resume audio" : "Pause audio")
                                : "Play audio"
                          }
                          icon={
                            isAudioLoading && playingMessageId === message.id
                              ? <Spinner size="sm" />
                              : playingMessageId === message.id 
                                ? (isAudioPaused ? <FiVolume2 /> : <FiPause />) 
                                : <FiVolume2 />
                          }
                          size="sm"
                          variant="ghost"
                          color={playingMessageId === message.id ? 'brand.500' : subtleColor}
                          rounded="full"
                          disabled={isAudioLoading && playingMessageId === message.id}
                          _hover={{
                            color: 'brand.500',
                            bg: brandBg,
                            transform: 'scale(1.1)',
                          }}
                          transition="all 0.2s"
                          onClick={async () => {
                            if (playingMessageId === message.id) {
                              if (isAudioPaused) {
                                await resumeCurrentAudio();
                              } else {
                                pauseCurrentAudio();
                              }
                            } else if (message.audioUrl) {
                              // Play existing audio if available
                              await playMessageAudio(message.id, message.audioUrl, true);
                            } else {
                              // Synthesize text to speech with auto-play
                              await synthesizeText(message.response, message.id, true);
                            }
                          }}
                        />
                        
                        {/* Audio time display when playing */}
                        {playingMessageId === message.id && audioDuration > 0 && (
                          <Text fontSize="xs" color={subtleColor} fontFamily="mono">
                            {formatAudioTime(audioCurrentTime, audioDuration)}
                          </Text>
                        )}
                        
                        <Text fontSize="sm" color={subtleColor}>
                          {formatMessageTime(message.timestamp)}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                </MotionBox>
              </VStack>
            ))}

            {isLoading && (
              <MotionBox
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <HStack justify="flex-start" spacing={3} align="flex-start" w="full">
                  <Box
                    w={12}
                    h={12}
                    bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                    rounded="xl"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    className="pulse-glow"
                  >
                    <Text color="white" fontWeight="black" fontSize="lg">
                      CC
                    </Text>
                  </Box>
                  <Box 
                    bg={assistantBg} 
                    backdropFilter="blur(20px)"
                    p={5} 
                    rounded="3xl" 
                    border="1px solid" 
                    borderColor={borderColor}
                    shadow="glass"
                  >
                    <HStack spacing={3}>
                      <Spinner size="sm" color="brand.500" />
                      <Text color={textColor} fontWeight="medium">Thinking...</Text>
                    </HStack>
                  </Box>
                </HStack>
              </MotionBox>
            )}

            <div ref={messagesEndRef} />
          </VStack>
        </MotionBox>

        {/* Input Area - Clean and Simple */}
        <Box
          p={4}
          borderTop="1px solid"
          borderColor={borderColor}
          bg={chatBgColor}
        >
          <Box maxW="4xl" mx="auto">
            {/* Document Context Indicator */}
            {selectedDocuments.length > 0 && (
              <Box mb={3}>
                <HStack
                  p={3}
                  bg={brandBg}
                  rounded="lg"
                  border="1px solid"
                  borderColor="brand.300"
                  spacing={3}
                  justify="space-between"
                >
                  <HStack spacing={2}>
                    <FiFile color="orange" size={16} />
                    <Text fontSize="sm" fontWeight="medium" color={textColor}>
                      Chatting with {selectedDocuments.length} document{selectedDocuments.length > 1 ? 's' : ''}
                    </Text>
                    <Badge colorScheme="brand" variant="subtle">
                      Context Enabled
                    </Badge>
                  </HStack>
                  
                  <HStack spacing={2}>
                    {onDocumentPanelToggle && (
                      <Tooltip label="Open document panel">
                        <IconButton
                          aria-label="Open documents"
                          icon={<FiFolder />}
                          size="xs"
                          variant="ghost"
                          onClick={onDocumentPanelToggle}
                          color={subtleColor}
                          _hover={{ color: 'brand.500' }}
                        />
                      </Tooltip>
                    )}
                    {onDocumentSelectionChange && (
                      <Tooltip label="Clear document context">
                        <IconButton
                          aria-label="Clear documents"
                          icon={<FiX />}
                          size="xs"
                          variant="ghost"
                          onClick={() => onDocumentSelectionChange([])}
                          color={subtleColor}
                          _hover={{ color: 'red.500' }}
                        />
                      </Tooltip>
                    )}
                  </HStack>
                </HStack>
              </Box>
            )}
            
            <MotionBox
              bg={inputBg}
              rounded="xl"
              border="1px solid"
              borderColor={borderColor}
              p={3}
              _focusWithin={{
                borderColor: "brand.500",
              }}
              transition="all 0.2s"
            >
              <HStack spacing={3}>
                <Box flex={1}>
                  <Input
                    value={inputValue}
                    onChange={handleInputChange}
                    onKeyPress={handleKeyPress}
                    onFocus={handleInputFocus}
                    placeholder="Type your message or record voice..."
                    disabled={isLoading}
                    variant="unstyled"
                    size="lg"
                    fontSize="md"
                    _placeholder={{ color: subtleColor }}
                    color={textColor}
                  />
                </Box>
                
                <HStack spacing={2}>
                  <FileUpload
                    onFileUploaded={(document: Document) => {
                      toast({
                        title: 'Document uploaded',
                        description: `${document.filename} is ready for chat`,
                        status: 'success',
                        duration: 3000,
                      });
                      // Notify parent about document upload
                      onDocumentUploaded?.();
                    }}
                    isDisabled={isLoading}
                  />
                  
                  <IconButton
                    aria-label="Start recording"
                    icon={<FiMic />}
                    onClick={handleVoiceButtonClick}
                    variant="ghost"
                    size="lg"
                    disabled={isLoading}
                    color={subtleColor}
                    rounded="xl"
                    _hover={{
                      bg: brandBg,
                      color: "brand.500",
                      transform: "scale(1.1)",
                    }}
                    transition="all 0.2s"
                  />
                  
                  <IconButton
                    aria-label="Send message"
                    icon={<FiSend />}
                    onClick={sendMessage}
                    colorScheme="brand"
                    size="lg"
                    rounded="xl"
                    disabled={isLoading || !inputValue.trim()}
                    bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                    color="white"
                    _hover={{
                      bgGradient: "linear(135deg, brand.600 0%, brand.700 100%)",
                      transform: "scale(1.05)",
                    }}
                    _active={{
                      transform: "scale(0.95)",
                    }}
                    _disabled={{
                      opacity: 0.6,
                      cursor: "not-allowed",
                      transform: "none",
                    }}
                    transition="all 0.2s"
                  />
                </HStack>
              </HStack>
            </MotionBox>
          </Box>
        </Box>
      </MotionFlex>

      {/* Recording Modal */}
      <Modal isOpen={isRecordingModalOpen} onClose={() => {}} closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.300" />
        <ModalContent bg={chatBgColor} rounded="2xl" mx={4}>
          <ModalBody p={8}>
            <VStack spacing={6}>
              <Box textAlign="center">
                <Text fontSize="lg" fontWeight="semibold" mb={2}>
                  Recording...
                </Text>
                <Text color="gray.500">
                  Speak now, your message is being recorded
                </Text>
              </Box>

              <Box w="full">
                <Progress
                  value={(recordingTime % 60) * (100 / 60)}
                  colorScheme="orange"
                  size="sm"
                  rounded="full"
                />
                <Text textAlign="center" mt={2} fontFamily="mono">
                  {formatTime(recordingTime)}
                </Text>
              </Box>

              <HStack spacing={4}>
                <IconButton
                  aria-label="Cancel recording"
                  icon={<FiX />}
                  onClick={cancelRecording}
                  colorScheme="gray"
                  size="lg"
                  rounded="full"
                />
                <IconButton
                  aria-label="Stop recording"
                  icon={<FiCheck />}
                  onClick={stopRecording}
                  colorScheme="orange"
                  size="lg"
                  rounded="full"
                />
              </HStack>
            </VStack>
          </ModalBody>
        </ModalContent>
      </Modal>
    </>
  );
};

export default ChatArea;
