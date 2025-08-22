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
} from '@chakra-ui/react';
import { FiMic, FiSend, FiVolume2, FiPlus, FiX, FiCheck, FiPause, FiSun, FiMoon } from 'react-icons/fi';
import { endpoints } from '../lib/api';
import { keyframes } from '@emotion/react';

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

  // Theme-aware colors - Premium design
  const panelBg = useColorModeValue('white', 'gray.800');
  const panelBorder = useColorModeValue('gray.100', 'gray.700');
  const userBubbleBg = useColorModeValue('brand.500', 'brand.600');
  const userBubbleColor = 'white';
  const asstBubbleBg = useColorModeValue('gray.50', 'gray.700');
  const asstBubbleColor = useColorModeValue('gray.800', 'gray.100');
  const subtleText = useColorModeValue('gray.400', 'gray.500');
  const recordPillBg = useColorModeValue('white', 'gray.700');
  const inputBg = useColorModeValue('white', 'gray.700');
  const inputBorder = useColorModeValue('gray.200', 'gray.600');
  const headerBg = useColorModeValue('white', 'gray.800');
  const shadowColor = useColorModeValue('rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)');
  const brandLogoBg = useColorModeValue('brand.50', 'brand.900');
  const aiAvatarBg = useColorModeValue('brand.100', 'brand.800');
  const userAvatarBg = useColorModeValue('gray.100', 'gray.600');
  const recordDotsBg = useColorModeValue('brand.400', 'brand.300');
  const focusBorderColor = useColorModeValue('#fb923c', '#fdba74');

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
    <VStack spacing={0} align="stretch" h="100vh" maxH="100vh">
      {/* Premium Header */}
      <Box 
        bg={headerBg} 
        borderBottom="1px" 
        borderColor={panelBorder}
        px={6} 
        py={4}
        boxShadow={`0 1px 3px ${shadowColor}`}
      >
        <HStack>
          <HStack spacing={3}>
            <Box 
              p={2} 
              bg={brandLogoBg} 
              borderRadius="xl"
            >
              <Image src="/ccript_logo.jpg" alt="CCRIPTER Logo" boxSize="24px" borderRadius="md" />
            </Box>
            <VStack align="start" spacing={0}>
              <Heading size="sm" fontWeight="600">CCRIPTER</Heading>
              <Text fontSize="xs" color={subtleText}>AI Assistant</Text>
            </VStack>
          </HStack>
          <Spacer />
          <ThemeToggle />
        </HStack>
      </Box>

      {/* Chat Area */}
      <Box 
        ref={listRef} 
        bg={panelBg} 
        flex="1" 
        overflowY="auto" 
        px={6} 
        py={4}
      >
        <VStack align="stretch" spacing={4}>
          {messages.map((m) => (
            <HStack 
              key={m.id} 
              justify={m.role === 'user' ? 'flex-end' : 'flex-start'}
              align="flex-start"
            >
              {m.role === 'assistant' && (
                <Box 
                  w="32px" 
                  h="32px" 
                  bg={aiAvatarBg} 
                  borderRadius="full" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Image src="/ccript_logo.jpg" alt="AI" boxSize="20px" borderRadius="full" />
                </Box>
              )}
              
              <VStack align={m.role === 'user' ? 'flex-end' : 'flex-start'} spacing={1} maxW="70%">
                {(m.text && m.text.trim().length > 0) && (
                  <Box 
                    bg={m.role === 'user' ? userBubbleBg : asstBubbleBg} 
                    color={m.role === 'user' ? userBubbleColor : asstBubbleColor} 
                    px={4} 
                    py={3} 
                    borderRadius={m.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px'}
                    boxShadow={`0 1px 2px ${shadowColor}`}
                    border="1px"
                    borderColor={m.role === 'user' ? 'transparent' : panelBorder}
                  >
                    <Text fontSize="sm" lineHeight="1.5">{m.text}</Text>
                  </Box>
                )}
                
                <HStack spacing={2} justify={m.role === 'user' ? 'flex-end' : 'flex-start'}>
                  {m.role === 'assistant' && (m.audioUrl || (m.text && m.text.trim().length > 0)) && (
                    playingMsgId === m.id ? (
                      <IconButton 
                        aria-label="Pause" 
                        icon={<FiPause />} 
                        size="xs" 
                        variant="ghost"
                        colorScheme="brand"
                        onClick={() => stopAllAudio()} 
                      />
                    ) : (
                      <IconButton
                        aria-label="Play"
                        icon={<FiVolume2 />}
                        size="xs"
                        variant="ghost"
                        colorScheme="brand"
                        onClick={() => {
                          if (m.audioUrl) {
                            playAudioUrl(m.audioUrl!, m.id);
                          } else if (m.text) {
                            speakText(m.text, m.id);
                          }
                        }}
                      />
                    )
                  )}
                  <Text fontSize="xs" color={subtleText}>
                    {formatPKT(m.createdAt)}
                  </Text>
                </HStack>
              </VStack>
              
              {m.role === 'user' && (
                <Box 
                  w="32px" 
                  h="32px" 
                  bg={userAvatarBg} 
                  borderRadius="full" 
                  display="flex" 
                  alignItems="center" 
                  justifyContent="center"
                  flexShrink={0}
                >
                  <Text fontSize="sm" fontWeight="600">U</Text>
                </Box>
              )}
            </HStack>
          ))}
          {loading && (
            <HStack justify="flex-start" spacing={3}>
              <Box 
                w="32px" 
                h="32px" 
                bg={aiAvatarBg} 
                borderRadius="full" 
                display="flex" 
                alignItems="center" 
                justifyContent="center"
              >
                <Image src="/ccript_logo.jpg" alt="AI" boxSize="20px" borderRadius="full" />
              </Box>
              <HStack 
                bg={asstBubbleBg} 
                px={4} 
                py={3} 
                borderRadius="20px 20px 20px 4px"
                boxShadow={`0 1px 2px ${shadowColor}`}
                border="1px"
                borderColor={panelBorder}
              >
                <Spinner size="sm" color="brand.500" />
                <Text fontSize="sm" color={subtleText}>Thinking...</Text>
              </HStack>
            </HStack>
          )}
        </VStack>
      </Box>

      {/* Input Area */}
      <Box 
        bg={headerBg} 
        borderTop="1px" 
        borderColor={panelBorder}
        px={6} 
        py={4}
        boxShadow={`0 -1px 3px ${shadowColor}`}
      >
        {recording ? (
          <Flex
            align="center"
            bg={recordPillBg}
            border="1px"
            borderColor={inputBorder}
            borderRadius="full"
            px={4}
            py={3}
            gap={3}
            boxShadow={`0 2px 8px ${shadowColor}`}
          >
            <Box flex="1" h="20px" display="flex" alignItems="center" justifyContent="center">
              {Array.from({ length: 24 }).map((_, i) => (
                <Box
                  key={i}
                  w="3px"
                  h="3px"
                  bg={recordDotsBg}
                  mx="2px"
                  borderRadius="full"
                  style={{ animation: `${dotPulse} 1.4s ease-in-out ${i * 0.08}s infinite` }}
                />
              ))}
            </Box>
            <IconButton 
              aria-label="Cancel" 
              icon={<FiX />} 
              size="sm" 
              variant="ghost"
              colorScheme="red" 
              onClick={cancelRecording} 
            />
            <IconButton 
              aria-label="Send" 
              icon={<FiCheck />} 
              size="sm" 
              colorScheme="brand" 
              onClick={confirmRecording} 
            />
          </Flex>
        ) : (
          <HStack spacing={3}>
            <IconButton
              aria-label="Record"
              icon={<FiMic />}
              size="lg"
              variant="ghost"
              colorScheme="brand"
              borderRadius="full"
              onClick={onToggleRecord}
            />
            <Input
              placeholder="Type your message..."
              value={input}
              onChange={onInputChange}
              onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => { if (e.key === 'Enter') onSendText(); }}
              bg={inputBg}
              border="1px"
              borderColor={inputBorder}
              borderRadius="full"
              px={4}
              py={3}
              fontSize="sm"
              _focus={{
                borderColor: 'brand.400',
                boxShadow: `0 0 0 1px ${focusBorderColor}`,
              }}
            />
            <IconButton
              aria-label="Send"
              icon={<FiSend />}
              size="lg"
              colorScheme="brand"
              borderRadius="full"
              onClick={onSendText}
              isDisabled={!input.trim()}
            />
          </HStack>
        )}
      </Box>
    </VStack>
  );
};

export default Chat;
