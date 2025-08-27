import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  IconButton,
  Input,
  Spinner,
  Text,
  VStack,
  useToast,
  Image,
  Heading,
  Spacer,
  useColorMode,
  useColorModeValue,
  Badge,
  Tooltip,
  Avatar,
} from '@chakra-ui/react';
import { FiMic, FiSend, FiVolume2, FiPlus, FiX, FiCheck, FiPause, FiSun, FiMoon } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import { endpoints } from '../lib/api';
import { keyframes } from '@emotion/react';

const MotionBox = motion(Box);
const MotionVStack = motion(VStack);
const MotionHStack = motion(HStack);

// Simple theme toggle button
const ThemeToggle: React.FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  const isDark = colorMode === 'dark';
  return (
    <IconButton
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      icon={isDark ? <FiSun /> : <FiMoon />}
      size="sm"
      onClick={toggleColorMode}
      variant="ghost"
    />
  );
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  audioUrl?: string;
  createdAt: number;
}

const Chat: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Hello! I\'m your CCRIPTER assistant. I can help you with questions, conversations, and voice interactions. Ask me anything!',
      createdAt: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const toast = useToast();
  const listRef = useRef<HTMLDivElement | null>(null);

  // --- Audio playback: serialized queue to prevent overlap ---
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const isPlayingRef = useRef(false);
  const currentItemRef = useRef<{ url: string; revokeAfter?: boolean; msgId?: string } | null>(null);
  const audioQueueRef = useRef<Array<{ url: string; revokeAfter?: boolean; msgId?: string }>>([]);
  const [playingMsgId, setPlayingMsgId] = useState<string | null>(null);
  const recordActionRef = useRef<'send' | 'cancel'>('send');
  const streamAbortRef = useRef<AbortController | null>(null);

  // Modern theme colors with glassmorphism
  const panelBg = useColorModeValue('glass-bg', 'glass-bg');
  const panelBorder = useColorModeValue('glass-border', 'glass-border');
  const userBubbleBg = useColorModeValue('linear-gradient(135deg, #f97316 0%, #ea580c 100%)', 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)');
  const userBubbleColor = 'white';
  const asstBubbleBg = useColorModeValue('rgba(255, 255, 255, 0.9)', 'rgba(55, 65, 81, 0.9)');
  const asstBubbleColor = useColorModeValue('gray.800', 'gray.100');
  const subtleText = useColorModeValue('gray.600', 'gray.400');
  const textColor = useColorModeValue('gray.800', 'gray.100');
  const recordPillBg = useColorModeValue('rgba(255, 255, 255, 0.95)', 'rgba(55, 65, 81, 0.95)');
  const inputBg = useColorModeValue('white', 'gray.800');
  const inputBorder = useColorModeValue('glass-border', 'glass-border');
  const headerBg = useColorModeValue('glass-bg', 'glass-bg');
  const brandLogoBg = useColorModeValue('brand.50', 'brand.900');
  const aiAvatarBg = useColorModeValue('brand.100', 'brand.800');
  const userAvatarBg = useColorModeValue('gray.100', 'gray.600');
  const recordDotsBg = useColorModeValue('brand.400', 'brand.300');
  const focusBorderColor = useColorModeValue('#fb923c', '#fdba74');
  const avatarBorder = useColorModeValue('white', 'gray.800');
  const brandBg = useColorModeValue('brand.50', 'brand.900');

  // dotted sequential pulse for recording indicator (light gray -> white -> light gray)
  const dotPulse = useMemo(() => keyframes`
    0% { background-color: var(--chakra-colors-gray-400); }
    50% { background-color: var(--chakra-colors-white); }
    100% { background-color: var(--chakra-colors-gray-400); }
  `, []);

  // format timestamp in PKT (Asia/Karachi)
  const formatPKT = useCallback((ts: number) => {
    try {
      return new Intl.DateTimeFormat('en-PK', {
        timeZone: 'Asia/Karachi',
        hour: '2-digit',
        minute: '2-digit',
      }).format(ts) + ' PKT';
    } catch {
      const d = new Date(ts);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' PKT';
    }
  }, []);

  const stopAllAudio = useCallback(() => {
    try {
      if (audioRef.current) {
        audioRef.current.pause();
        // Revoke current URL if it was a one-shot
        if (currentItemRef.current?.revokeAfter && audioRef.current.src?.startsWith('blob:')) {
          try { URL.revokeObjectURL(audioRef.current.src); } catch {}
        }
      }
    } catch {}
    audioRef.current = null;
    isPlayingRef.current = false;
    currentItemRef.current = null;
    setPlayingMsgId(null);
    // Revoke any queued one-shot URLs
    for (const item of audioQueueRef.current) {
      if (item.revokeAfter && item.url.startsWith('blob:')) {
        try { URL.revokeObjectURL(item.url); } catch {}
      }
    }
    audioQueueRef.current = [];
  }, []);

  const stopStreaming = useCallback(() => {
    try { streamAbortRef.current?.abort(); } catch {}
    streamAbortRef.current = null;
  }, []);

  const tryPlayNext = useCallback(() => {
    if (isPlayingRef.current) return;
    const next = audioQueueRef.current.shift();
    if (!next) return;

    isPlayingRef.current = true;
    const audio = new Audio(next.url);
    audioRef.current = audio;
    currentItemRef.current = next;
    setPlayingMsgId(next.msgId ?? null);
    const onEnded = () => {
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('error', onEnded);
      if (next.revokeAfter) {
        try { URL.revokeObjectURL(next.url); } catch {}
      }
      isPlayingRef.current = false;
      currentItemRef.current = null;
      setPlayingMsgId(null);
      // kick off next in queue
      tryPlayNext();
    };
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('error', onEnded);
    audio.play().catch(() => onEnded());
  }, []);

  const enqueueAndPlay = useCallback((url: string, revokeAfter?: boolean, msgId?: string) => {
    audioQueueRef.current.push({ url, revokeAfter, msgId });
    tryPlayNext();
  }, [tryPlayNext]);

  // Helper used by play buttons next to messages
  const playAudioUrl = useCallback((url: string, msgId?: string) => {
    stopAllAudio();
    enqueueAndPlay(url, false, msgId);
  }, [enqueueAndPlay, stopAllAudio]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount
      try {
        audioRef.current?.pause();
      } catch {}
      audioRef.current = null;
      // Revoke any queued one-shot URLs (created by speakText)
      for (const item of audioQueueRef.current) {
        if (item.revokeAfter) {
          try { URL.revokeObjectURL(item.url); } catch {}
        }
      }
      audioQueueRef.current = [];
      isPlayingRef.current = false;
    };
  }, []);

  const scrollToBottom = () => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' });
  };
  useEffect(() => { scrollToBottom(); }, [messages.length]);

  const speakText = useCallback(async (text: string, msgId?: string) => {
    try {
      stopAllAudio();
      const res = await fetch(endpoints.speak(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('TTS failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      // Queue and revoke after playback completes
      enqueueAndPlay(url, true, msgId);
    } catch (e: any) {
      toast({ status: 'error', title: 'Speak failed', description: e?.message || String(e) });
    }
  }, [toast, enqueueAndPlay, stopAllAudio]);

  const onSendText = useCallback(async () => {
    const query = input.trim();
    if (!query) return;
    setInput('');

    const now = Date.now();
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: query, createdAt: now };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', text: '', createdAt: now };
    setMessages(m => [...m, userMsg, assistantMsg]);

    try {
      setLoading(true);
      stopAllAudio();
      stopStreaming();
      // POST /chat/stream (SSE-like via fetch streaming)
      const ctrl = new AbortController();
      streamAbortRef.current = ctrl;
      const res = await fetch(endpoints.chatStream(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: 'demo', query }),
        signal: ctrl.signal,
      });
      if (!res.ok || !res.body) throw new Error('Stream failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const evt = JSON.parse(line.slice(6));
              if (evt.type === 'delta' && evt.text) {
                assistantText += evt.text;
                setMessages(m => m.map(msg => msg.id === assistantMsg.id ? { ...msg, text: assistantText } : msg));
              }
              if (evt.type === 'end') {
                // finalize
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      toast({ status: 'error', title: 'Chat failed', description: e?.message || String(e) });
    } finally {
      setLoading(false);
      streamAbortRef.current = null;
    }
  }, [input, toast, endpoints]);

  const onInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInput(e.target.value);
    // stop current audio or stream when user starts typing next message
    stopAllAudio();
    stopStreaming();
  }, [stopAllAudio, stopStreaming]);

  const onToggleRecord = useCallback(async () => {
    if (recording) {
      // We now control stop via cancel/confirm buttons
      return;
    }
    try {
      // Interrupt any current playback and streaming before recording
      stopAllAudio();
      stopStreaming();

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
        audioBitsPerSecond: 64000,
      });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' });
        const action = recordActionRef.current;
        chunksRef.current = [];
        if (action === 'send') {
          await onSendVoice(blob);
        }
        stream.getTracks().forEach(t => t.stop());
      };
      mr.start();
      recordActionRef.current = 'send';
      setRecording(true);
    } catch (e: any) {
      toast({ status: 'error', title: 'Mic error', description: e?.message || String(e) });
    }
  }, [recording, toast, stopAllAudio, stopStreaming]);

  const cancelRecording = useCallback(() => {
    recordActionRef.current = 'cancel';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const confirmRecording = useCallback(() => {
    recordActionRef.current = 'send';
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  const onSendVoice = useCallback(async (blob: Blob) => {
    const form = new FormData();
    form.append('file', blob, `recording.webm`);
    form.append('user_id', 'demo');

    const now = Date.now();
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', text: '(speaking...)', createdAt: now };
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', text: '', createdAt: now };
    setMessages(m => [...m, userMsg, assistantMsg]);

    try {
      setLoading(true);
      // Binary mode: WAV body; transcript/text via headers
      const res = await fetch(endpoints.voiceChat('binary'), { method: 'POST', body: form });
      if (!res.ok) throw new Error(`Voice chat failed (${res.status})`);

      const transcriptHeader = res.headers.get('X-Transcript') || '(no transcript)';
      // We intentionally do not show assistant text for voice input

      // Update user transcript
      setMessages(m => m.map(msg => msg.id === userMsg.id ? { ...msg, text: transcriptHeader } : msg));

      const audioBlob = await res.blob();
      const url = URL.createObjectURL(audioBlob);
      setMessages(m => m.map(msg => msg.id === assistantMsg.id ? { ...msg, audioUrl: url } : msg));
      // Auto-play reply audio in order (do not revoke so replay stays available)
      enqueueAndPlay(url, false);
    } catch (e: any) {
      toast({ status: 'error', title: 'Voice chat failed', description: e?.message || String(e) });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  return (
    <MotionVStack 
      spacing={0} 
      align="stretch" 
      h="100vh" 
      maxH="100vh"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Modern Premium Header */}
      <MotionBox 
        bg={headerBg}
        backdropFilter="blur(20px)"
        borderBottom="1px solid"
        borderColor={panelBorder}
        px={6} 
        py={4}
        shadow="glass"
        position="sticky"
        top={0}
        zIndex={10}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.1 }}
      >
        <HStack justify="space-between">
          <HStack spacing={4}>
            <MotionBox
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 400, damping: 17 }}
            >
              <Box 
                w={12}
                h={12}
                bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                borderRadius="xl"
                display="flex"
                alignItems="center"
                justifyContent="center"
                shadow="lg"
                position="relative"
                _before={{
                  content: '""',
                  position: 'absolute',
                  inset: 0,
                  rounded: 'xl',
                  p: '1px',
                  bgGradient: 'linear(135deg, rgba(255,255,255,0.4) 0%, rgba(255,255,255,0.1) 100%)',
                  mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                  maskComposite: 'subtract',
                }}
              >
                <Text color="white" fontWeight="black" fontSize="lg">
                  CC
                </Text>
              </Box>
            </MotionBox>
            
            <VStack align="start" spacing={0}>
              <HStack spacing={2} align="center">
                <Heading 
                  size="md" 
                  fontWeight="bold"
                  color={textColor}
                  className="gradient-text"
                >
                  CCRIPTER
                </Heading>
                <Badge 
                  colorScheme="brand" 
                  size="sm" 
                  rounded="full"
                  px={2}
                  fontSize="xs"
                  fontWeight="semibold"
                >
                  AI
                </Badge>
              </HStack>
              <Text fontSize="sm" color={subtleText} fontWeight="medium">
                Voice Assistant
              </Text>
            </VStack>
          </HStack>
          
          <MotionBox
            whileHover={{ scale: 1.05, rotate: 180 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
          >
            <ThemeToggle />
          </MotionBox>
        </HStack>
      </MotionBox>

      {/* Modern Chat Area */}
      <MotionBox 
        ref={listRef} 
        bg="transparent"
        flex="1" 
        overflowY="auto" 
        px={6} 
        py={6}
        className="hide-scrollbar"
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <VStack align="stretch" spacing={6}>
          <AnimatePresence>
            {messages.map((m, index) => (
              <MotionBox
                key={m.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: m.role === 'user' ? 20 : -20 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.01 }}
              >
                <HStack 
                  justify={m.role === 'user' ? 'flex-end' : 'flex-start'}
                  align="flex-start"
                  spacing={3}
                >
                  {m.role === 'assistant' && (
                    <MotionBox
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <Box 
                        w={12} 
                        h={12} 
                        bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                        borderRadius="xl" 
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
                        <Text color="white" fontWeight="black" fontSize="md">
                          CC
                        </Text>
                      </Box>
                    </MotionBox>
                  )}
                  
                  <VStack 
                    align={m.role === 'user' ? 'flex-end' : 'flex-start'} 
                    spacing={2} 
                    maxW="70%"
                    flex={1}
                  >
                    {(m.text && m.text.trim().length > 0) && (
                      <MotionBox
                        whileHover={{ 
                          scale: 1.02,
                          boxShadow: m.role === 'user' ? 'glow' : 'glass',
                        }}
                        transition={{ duration: 0.2 }}
                      >
                        <Box 
                          bg={m.role === 'user' ? userBubbleBg : asstBubbleBg}
                          backdropFilter="blur(10px)"
                          color={m.role === 'user' ? userBubbleColor : asstBubbleColor} 
                          px={6} 
                          py={4} 
                          borderRadius={m.role === 'user' ? '3xl 3xl lg 3xl' : '3xl 3xl 3xl lg'}
                          shadow={m.role === 'user' ? 'xl' : 'glass'}
                          border="1px solid"
                          borderColor={m.role === 'user' ? 'rgba(255,255,255,0.2)' : panelBorder}
                          position="relative"
                        >
                          <Text 
                            fontSize="md" 
                            lineHeight="1.6"
                            fontWeight="medium"
                          >
                            {m.text}
                          </Text>
                        </Box>
                      </MotionBox>
                    )}
                    
                    <HStack 
                      spacing={3} 
                      justify={m.role === 'user' ? 'flex-end' : 'flex-start'}
                      pl={m.role === 'assistant' ? 2 : 0}
                      pr={m.role === 'user' ? 2 : 0}
                    >
                      {m.role === 'assistant' && (m.audioUrl || (m.text && m.text.trim().length > 0)) && (
                        <Tooltip 
                          label={playingMsgId === m.id ? 'Pause' : 'Play audio'}
                          placement="top"
                        >
                          <MotionBox
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.9 }}
                          >
                            {playingMsgId === m.id ? (
                              <IconButton 
                                aria-label="Pause" 
                                icon={<FiPause />} 
                                size="sm" 
                                variant="ghost"
                                colorScheme="brand"
                                rounded="full"
                                _hover={{
                                  bg: brandBg,
                                  transform: 'scale(1.1)',
                                }}
                                onClick={() => stopAllAudio()} 
                              />
                            ) : (
                              <IconButton
                                aria-label="Play"
                                icon={<FiVolume2 />}
                                size="sm"
                                variant="ghost"
                                colorScheme="brand"
                                rounded="full"
                                _hover={{
                                  bg: brandBg,
                                  transform: 'scale(1.1)',
                                }}
                                onClick={() => {
                                  if (m.audioUrl) {
                                    playAudioUrl(m.audioUrl!, m.id);
                                  } else if (m.text) {
                                    speakText(m.text, m.id);
                                  }
                                }}
                              />
                            )}
                          </MotionBox>
                        </Tooltip>
                      )}
                      <Text fontSize="sm" color={subtleText} fontWeight="medium">
                        {formatPKT(m.createdAt)}
                      </Text>
                    </HStack>
                  </VStack>
                  
                  {m.role === 'user' && (
                    <MotionBox
                      whileHover={{ scale: 1.1 }}
                      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
                    >
                      <Avatar
                        size="md"
                        name="User"
                        bg="brand.500"
                        color="white"
                        fontWeight="bold"
                        border="2px solid"
                        borderColor={avatarBorder}
                        shadow="lg"
                      />
                    </MotionBox>
                  )}
                </HStack>
              </MotionBox>
            ))}
          </AnimatePresence>
          {loading && (
            <MotionBox
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <HStack justify="flex-start" spacing={3}>
                <Box 
                  w={12} 
                  h={12} 
                  bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                  borderRadius="xl" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  className="pulse-glow"
                  border="2px solid"
                  borderColor={avatarBorder}
                >
                  <Text color="white" fontWeight="black" fontSize="md">
                    CC
                  </Text>
                </Box>
                <Box
                  bg={asstBubbleBg}
                  backdropFilter="blur(20px)"
                  px={6} 
                  py={4} 
                  borderRadius="3xl 3xl 3xl lg"
                  shadow="glass"
                  border="1px solid"
                  borderColor={panelBorder}
                >
                  <HStack spacing={3}>
                    <Spinner size="sm" color="brand.500" />
                    <Text fontSize="md" color={textColor} fontWeight="medium">
                      Thinking...
                    </Text>
                  </HStack>
                </Box>
              </HStack>
            </MotionBox>
          )}
        </VStack>
      </MotionBox>

      {/* Modern Floating Input Area */}
      <MotionBox 
        bg={headerBg}
        backdropFilter="blur(20px)"
        borderTop="1px solid"
        borderColor={panelBorder}
        px={6} 
        py={6}
        shadow="glass"
        position="sticky"
        bottom={0}
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        {recording ? (
          <MotionBox
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Flex
              align="center"
              bg={recordPillBg}
              backdropFilter="blur(20px)"
              border="2px solid"
              borderColor="brand.400"
              borderRadius="3xl"
              px={6}
              py={4}
              gap={4}
              shadow="glow"
              position="relative"
              _before={{
                content: '""',
                position: 'absolute',
                inset: 0,
                rounded: '3xl',
                p: '2px',
                bgGradient: 'linear(135deg, brand.400 0%, brand.600 100%)',
                mask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                maskComposite: 'subtract',
              }}
            >
              <Box flex="1" h="24px" display="flex" alignItems="center" justifyContent="center">
                {Array.from({ length: 24 }).map((_, i) => (
                  <Box
                    key={i}
                    w="4px"
                    h="4px"
                    bg={recordDotsBg}
                    mx="2px"
                    borderRadius="full"
                    style={{ animation: `${dotPulse} 1.4s ease-in-out ${i * 0.08}s infinite` }}
                  />
                ))}
              </Box>
              
              <HStack spacing={2}>
                <Tooltip label="Cancel recording">
                  <MotionBox whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton 
                      aria-label="Cancel" 
                      icon={<FiX />} 
                      size="md" 
                      variant="ghost"
                      colorScheme="red"
                      rounded="full"
                      onClick={cancelRecording} 
                    />
                  </MotionBox>
                </Tooltip>
                
                <Tooltip label="Send recording">
                  <MotionBox whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                    <IconButton 
                      aria-label="Send" 
                      icon={<FiCheck />} 
                      size="md" 
                      colorScheme="brand"
                      rounded="full"
                      onClick={confirmRecording} 
                    />
                  </MotionBox>
                </Tooltip>
              </HStack>
            </Flex>
          </MotionBox>
        ) : (
          <MotionBox
            bg={inputBg}
            backdropFilter="blur(20px)"
            rounded="3xl"
            border="2px solid"
            borderColor={inputBorder}
            shadow="xl"
            p={3}
            _focusWithin={{
              borderColor: "brand.500",
              shadow: "glow",
              transform: "translateY(-2px)",
            }}
            transition="all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
            whileHover={{ scale: 1.02 }}
          >
            <HStack spacing={4}>
              <Tooltip label="Record voice message">
                <MotionBox whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <IconButton
                    aria-label="Record"
                    icon={<FiMic />}
                    size="lg"
                    variant="ghost"
                    colorScheme="brand"
                    borderRadius="xl"
                    _hover={{
                      bg: brandBg,
                      color: 'brand.500',
                    }}
                    onClick={onToggleRecord}
                  />
                </MotionBox>
              </Tooltip>
              
              <Input
                placeholder="Type your message..."
                value={input}
                onChange={onInputChange}
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { 
                  if (e.key === 'Enter') onSendText(); 
                }}
                variant="unstyled"
                size="lg"
                fontSize="md"
                flex={1}
                _placeholder={{ color: subtleText }}
                color={textColor}
              />
              
              <Tooltip label="Send message">
                <MotionBox whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                  <IconButton
                    aria-label="Send"
                    icon={<FiSend />}
                    size="lg"
                    colorScheme="brand"
                    borderRadius="xl"
                    onClick={onSendText}
                    isDisabled={!input.trim()}
                    bgGradient="linear(135deg, brand.500 0%, brand.600 100%)"
                    color="white"
                    _hover={{
                      bgGradient: "linear(135deg, brand.600 0%, brand.700 100%)",
                      shadow: "glow",
                    }}
                    _disabled={{
                      opacity: 0.6,
                      cursor: "not-allowed",
                      transform: "none",
                    }}
                    shadow="lg"
                  />
                </MotionBox>
              </Tooltip>
            </HStack>
          </MotionBox>
        )}
      </MotionBox>
    </MotionVStack>
  );
};

export default Chat;
