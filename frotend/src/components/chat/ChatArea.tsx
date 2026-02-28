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
  Modal,
  ModalOverlay,
  ModalContent,
  ModalBody,
  useDisclosure,
} from '@chakra-ui/react';
import { FiSend, FiMic, FiVolume2, FiX, FiCheck, FiPause, FiFile, FiZap, FiMessageCircle, FiCommand } from 'react-icons/fi';
import { motion } from 'framer-motion';
import { chatAPI, endpoints } from '../../lib/api';
import { useAuth } from '../../contexts/AuthContext';
import FileUpload from '../common/FileUpload';
import NeuralLogo from '../common/NeuralLogo';
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
}

const ChatArea: React.FC<ChatAreaProps> = ({
  chatId,
  onChatCreated,
  onChatTitleUpdated,
  isSidebarCollapsed = false,
  selectedDocuments = [],
  onDocumentSelectionChange,
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [, setIsRecording] = useState(false);
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
  const streamAbortRef = useRef<AbortController | null>(null);
  const ttsQueueRef = useRef<{
    items: Promise<Blob | null>[];
    playIdx: number;
    playing: boolean;
    audio: HTMLAudioElement | null;
    msgId: number;
    gen: number; // generation counter — increments on each new message to discard stale TTS
  }>({ items: [], playIdx: 0, playing: false, audio: null, msgId: 0, gen: 0 });

  const { user } = useAuth();
  const toast = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { isOpen: isRecordingModalOpen, onOpen: onRecordingModalOpen, onClose: onRecordingModalClose } = useDisclosure();

  // Colors
  const textColor = useColorModeValue('surface.800', 'surface.100');
  const subtleColor = useColorModeValue('surface.500', 'surface.500');
  const userBubbleBg = useColorModeValue('brand.500', 'brand.500');
  const userBubbleColor = useColorModeValue('surface.950', 'surface.950');
  const aiBubbleBg = useColorModeValue('rgba(255,255,255,0.8)', 'rgba(24, 24, 27, 0.6)');
  const aiBubbleBorder = useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)');
  const inputBg = useColorModeValue('white', 'rgba(24, 24, 27, 0.6)');
  const inputBorderColor = useColorModeValue('rgba(0,0,0,0.08)', 'rgba(255,255,255,0.06)');
  const chatAreaBg = useColorModeValue('transparent', 'transparent');
  const suggestBg = useColorModeValue('rgba(255,255,255,0.6)', 'rgba(255,255,255,0.03)');
  const suggestBorder = useColorModeValue('rgba(0,0,0,0.06)', 'rgba(255,255,255,0.06)');
  const suggestHoverBg = useColorModeValue('rgba(255,255,255,0.9)', 'rgba(255,255,255,0.06)');
  const suggestHoverBorder = useColorModeValue('brand.200', 'brand.800');
  const docContextBg = useColorModeValue('brand.50', 'rgba(245,158,11,0.06)');
  const docContextBorder = useColorModeValue('brand.200', 'rgba(245,158,11,0.15)');
  const inputFocusBorder = useColorModeValue('brand.300', 'brand.600');
  const placeholderColor = useColorModeValue('surface.400', 'surface.600');
  const audioHoverBg = useColorModeValue('brand.50', 'rgba(245,158,11,0.1)');
  const welcomeBg = useColorModeValue('surface.50', 'surface.950');
  const recordingModalBg = useColorModeValue('white', 'surface.900');
  const cancelHoverBg = useColorModeValue('red.50', 'rgba(239,68,68,0.1)');

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  useEffect(() => {
    if (chatId) {
      stopAllAudio();
      stopStreaming();
      loadChatMessages();
    } else {
      stopAllAudio();
      stopStreaming();
      setMessages([]);
    }
  }, [chatId]);

  const loadChatMessages = async () => {
    if (!chatId) return;
    try {
      const response = await chatAPI.getChatMessages(chatId);
      setMessages(response.data.reverse());
    } catch (error) {
      toast({ title: 'Failed to load messages', status: 'error', duration: 3000 });
    }
  };

  const sendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    stopAllAudio();
    stopStreaming();

    const userMessage = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    // ── Always use SSE streaming (with optional document_ids) ──
    const tempId = Date.now();
    const placeholderMsg: Message = {
      id: tempId,
      user_id: '',
      chat_id: chatId,
      timestamp: new Date().toISOString(),
      query: userMessage,
      response: '',
    };
    setMessages((prev) => [...prev, placeholderMsg]);

    const abortCtrl = new AbortController();
    streamAbortRef.current = abortCtrl;

    // Reset TTS queue for this message
    stopTTSQueue();
    ttsQueueRef.current.msgId = tempId;

    try {
      const token = localStorage.getItem('auth_token');
      const body: Record<string, unknown> = { query: userMessage, chat_id: chatId };
      if (selectedDocuments.length > 0) {
        body.document_ids = selectedDocuments;
      }

      console.log('[ChatArea] streaming request body:', JSON.stringify(body));
      const res = await fetch(endpoints.chatStream(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify(body),
        signal: abortCtrl.signal,
      });

      if (!res.ok) {
        throw new Error(`Server error ${res.status}`);
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalMsgId = tempId;
      let finalChatId = chatId;
      let fullText = '';
      let sentenceBuf = ''; // accumulates text for TTS sentence detection

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (!jsonStr) continue;

          try {
            const evt = JSON.parse(jsonStr);

            if (evt.type === 'start') {
              finalChatId = evt.chat_id;
              if (!chatId && finalChatId && onChatCreated) {
                onChatCreated(finalChatId);
              }
            } else if (evt.type === 'delta') {
              fullText += evt.text;
              sentenceBuf += evt.text;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempId ? { ...m, response: fullText, chat_id: finalChatId } : m
                )
              );

              // Progressive TTS: fire every ~60 chars for faster first audio
              if (sentenceBuf.length >= 60) {
                // Try to break at a sentence boundary
                const lastBreak = Math.max(
                  sentenceBuf.lastIndexOf('. '),
                  sentenceBuf.lastIndexOf('! '),
                  sentenceBuf.lastIndexOf('? '),
                  sentenceBuf.lastIndexOf('.\n'),
                  sentenceBuf.lastIndexOf(', '),
                );
                const splitAt = lastBreak > 15 ? lastBreak + 1 : sentenceBuf.length;
                const chunk = sentenceBuf.slice(0, splitAt).trim();
                sentenceBuf = sentenceBuf.slice(splitAt);
                if (chunk.length >= 8) {
                  enqueueTTS(chunk);
                }
              }
            } else if (evt.type === 'end') {
              finalMsgId = evt.message_id;
              finalChatId = evt.chat_id;
              const finalText = evt.text || fullText;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === tempId
                    ? { ...m, id: finalMsgId, response: finalText, chat_id: finalChatId }
                    : m
                )
              );
              // Update the message id in TTS queue
              ttsQueueRef.current.msgId = finalMsgId;
              // Flush any remaining text to TTS
              if (sentenceBuf.trim().length >= 3) {
                enqueueTTS(sentenceBuf.trim());
              }
              sentenceBuf = '';
            } else if (evt.type === 'error') {
              throw new Error(evt.message || 'Streaming error');
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes('JSON'))
              throw parseErr;
          }
        }
      }
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      toast({
        title: 'Failed to send message',
        description: error.message || 'Something went wrong',
        status: 'error',
        duration: 3000,
      });
      // Remove the placeholder if streaming failed entirely with no text
      setMessages((prev) => {
        const msg = prev.find((m) => m.id === tempId);
        if (msg && !msg.response) return prev.filter((m) => m.id !== tempId);
        return prev;
      });
    } finally {
      streamAbortRef.current = null;
      setIsLoading(false);
    }
  };

  // ── Recording ──
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
        stream.getTracks().forEach((track) => track.stop());
        setRecordingTime(0);
        if (recordingInterval.current) clearInterval(recordingInterval.current);
      };

      recorder.start();
      setMediaRecorder(recorder);
      setIsRecording(true);
      setRecordingTime(0);
      onRecordingModalOpen();

      recordingInterval.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      toast({ title: 'Microphone access required', status: 'error', duration: 3000 });
    }
  };

  const stopRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      setMediaRecorder(null);
      setIsRecording(false);
      if (recordingInterval.current) clearInterval(recordingInterval.current);
    }
  };

  const cancelRecording = () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stream.getTracks().forEach((track) => track.stop());
      setMediaRecorder(null);
      setIsRecording(false);
      setRecordingTime(0);
      onRecordingModalClose();
      if (recordingInterval.current) clearInterval(recordingInterval.current);
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
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
  };

  // ── Audio Controls ──
  const stopCurrentAudio = () => {
    if (currentAudio) {
      try {
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
        setAudioDuration(0);
        setAudioCurrentTime(0);
        currentAudio.pause();
        currentAudio.currentTime = 0;
      } catch (error) { /* ignore */ }
    }
  };

  const pauseCurrentAudio = () => {
    if (currentAudio && !currentAudio.paused) {
      try {
        setAudioPosition(currentAudio.currentTime);
        currentAudio.pause();
        setIsAudioPaused(true);
      } catch (error) { stopCurrentAudio(); }
    }
  };

  const resumeCurrentAudio = async () => {
    if (currentAudio && currentAudio.paused && !isAudioLoading) {
      try {
        currentAudio.currentTime = audioPosition;
        await currentAudio.play();
        setIsAudioPaused(false);
      } catch (error) { stopCurrentAudio(); }
    }
  };

  const synthesizeText = async (text: string, messageId: number, autoPlay: boolean = false) => {
    try {
      stopCurrentAudio();
      setIsAudioLoading(true);

      const token = localStorage.getItem('auth_token');
      const response = await fetch(endpoints.speak(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
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
      audio.preload = 'auto';

      audio.onended = () => {
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
        URL.revokeObjectURL(audioUrl);
      };

      audio.onerror = () => {
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
        URL.revokeObjectURL(audioUrl);
      };

      const playAudio = async () => {
        setIsAudioLoading(false);
        setAudioDuration(audio.duration || 0);
        audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime);

        if (autoPlay) {
          try {
            await audio.play();
            setCurrentAudio(audio);
            setPlayingMessageId(messageId);
            setIsAudioPaused(false);
          } catch {
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

      if (audio.readyState >= 3) await playAudio();
      else { audio.oncanplaythrough = playAudio; audio.load(); }
    } catch (error: any) {
      setIsAudioLoading(false);
      toast({
        title: 'Speech synthesis unavailable',
        description: error.message || 'Voice is not available',
        status: 'error',
        duration: 3000,
      });
    }
  };

  const playMessageAudio = async (messageId: number, audioUrl: string, autoPlay: boolean = true) => {
    try {
      stopCurrentAudio();
      setIsAudioLoading(true);

      const audio = new Audio(audioUrl);
      audio.preload = 'auto';

      audio.onended = () => {
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
      };

      audio.onerror = () => {
        setCurrentAudio(null);
        setPlayingMessageId(null);
        setIsAudioPaused(false);
        setAudioPosition(0);
        setIsAudioLoading(false);
      };

      const playAudio = async () => {
        setIsAudioLoading(false);
        setAudioDuration(audio.duration || 0);
        audio.ontimeupdate = () => setAudioCurrentTime(audio.currentTime);

        if (autoPlay) {
          try {
            await audio.play();
            setCurrentAudio(audio);
            setPlayingMessageId(messageId);
            setIsAudioPaused(false);
          } catch {
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

      if (audio.readyState >= 3) await playAudio();
      else { audio.oncanplaythrough = playAudio; audio.load(); }

      return audio;
    } catch (error) {
      setIsAudioLoading(false);
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

      setMessages((prev) => [...prev, newMessage]);
      if (audioUrl) playMessageAudio(response.data.message_id, audioUrl, true);

      if (!chatId && response.data.chat_id && onChatCreated) onChatCreated(response.data.chat_id);
      if (chatId && onChatTitleUpdated && messages.length === 0) {
        const transcript = response.data.transcript || '';
        const words = transcript.trim().split(/\s+/);
        const meaningfulWords = words.filter(
          (word: string) =>
            word.length > 2 &&
            !['the','and','or','but','in','on','at','to','for','of','with','by','is','are','was','were','have','has','had','will','would','could','should','can','may','might','do','does','did','am','be','been','being','a','an','this','that','these','those','i','me','my','mine','you','your','yours','he','him','his','she','her','hers','it','its','we','us','our','ours','they','them','their','theirs'].includes(word.toLowerCase())
        );
        let titleWords;
        if (meaningfulWords.length >= 3) titleWords = meaningfulWords.slice(0, 3);
        else if (meaningfulWords.length >= 2) titleWords = meaningfulWords.slice(0, 2);
        else if (meaningfulWords.length > 0) titleWords = meaningfulWords.slice(0, 1);
        else titleWords = words.slice(0, Math.min(3, words.length));
        const smartTitle = titleWords.map((w: string) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
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
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    stopAllAudio();
    stopStreaming();
    setInputValue(e.target.value);
  };

  const handleInputFocus = () => { stopAllAudio(); stopStreaming(); };

  const handleVoiceButtonClick = async () => {
    stopAllAudio();
    stopStreaming();
    await startRecording();
  };

  const stopAllAudio = () => {
    if (currentAudio) {
      try {
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.ontimeupdate = null;
        currentAudio.oncanplaythrough = null;
      } catch { /* ignore */ }
      setCurrentAudio(null);
    }
    stopTTSQueue();
    setPlayingMessageId(null);
    setIsAudioPaused(false);
    setAudioPosition(0);
    setIsAudioLoading(false);
    setAudioDuration(0);
    setAudioCurrentTime(0);
  };

  const stopStreaming = () => {
    if (streamAbortRef.current) {
      streamAbortRef.current.abort();
      streamAbortRef.current = null;
    }
  };

  // ── Progressive TTS (plays sentence-by-sentence while text streams) ──
  const fetchTTSBlob = async (text: string): Promise<Blob | null> => {
    try {
      const token = localStorage.getItem('auth_token');
      const res = await fetch(endpoints.speak(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` }),
        },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return null;
      return await res.blob();
    } catch {
      return null;
    }
  };

  /** Plays TTS blobs in strict order (awaits each Promise in sequence). */
  const playNextTTSChunk = async () => {
    const q = ttsQueueRef.current;
    if (q.playing) return;          // another instance already running
    if (q.playIdx >= q.items.length) return; // nothing to play

    q.playing = true;
    const gen = q.gen;

    while (q.gen === gen && q.playIdx < q.items.length) {
      const blob = await q.items[q.playIdx];
      q.playIdx++;

      if (!blob || q.gen !== gen) continue; // stale or failed

      await new Promise<void>((resolve) => {
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        q.audio = audio;
        setPlayingMessageId(q.msgId);
        setIsAudioPaused(false);

        const onDone = () => {
          URL.revokeObjectURL(url);
          q.audio = null;
          resolve();
        };
        audio.onended = onDone;
        audio.onerror = onDone;
        audio.play().catch(onDone);
      });
    }

    q.playing = false;
    // Pick up items added between while-exit and playing=false
    if (q.gen === gen && q.playIdx < q.items.length) {
      playNextTTSChunk();
    } else if (q.gen === gen) {
      setPlayingMessageId(null);
    }
  };

  /** Enqueue a TTS chunk — fires the fetch immediately, playback awaits in order. */
  const enqueueTTS = (text: string) => {
    const q = ttsQueueRef.current;
    const gen = q.gen;
    const blobPromise = fetchTTSBlob(text).then((blob) => {
      if (ttsQueueRef.current.gen !== gen) return null; // message changed, discard
      return blob;
    });
    q.items.push(blobPromise);
    playNextTTSChunk();
  };

  const stopTTSQueue = () => {
    const q = ttsQueueRef.current;
    q.items = [];
    q.playIdx = 0;
    if (q.audio) {
      try { q.audio.pause(); } catch { /* */ }
      q.audio = null;
    }
    q.playing = false;
    q.gen++;   // invalidate any in-flight TTS fetches from previous message
    q.msgId = 0;
  };

  // ── Suggested Prompts ──
  const suggestedPrompts = [
    { icon: <FiZap size={14} />, text: 'Explain quantum computing simply' },
    { icon: <FiMessageCircle size={14} />, text: 'Help me write a professional email' },
    { icon: <FiCommand size={14} />, text: 'Debug my Python code' },
  ];

  return (
    <>
      <MotionFlex
        direction="column"
        h="100%"
        maxH="100%"
        bg={chatAreaBg}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.4 }}
        overflow="hidden"
      >
        {/* Messages Area */}
        <Box
          flex={1}
          overflowY="auto"
          px={{ base: 4, md: 6, lg: 8 }}
          py={6}
          className="hide-scrollbar"
        >
          <Box maxW="800px" mx="auto">
            <VStack spacing={5} align="stretch" w="full">
              {/* Welcome Screen */}
              {messages.length === 0 && !isLoading && (
                <VStack spacing={8} py={{ base: 12, md: 20 }} align="center">
                  {/* AI Avatar */}
                  <MotionBox
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.1, type: 'spring', stiffness: 200 }}
                  >
                    <Box position="relative">
                      <NeuralLogo size={72} />
                      {/* Online indicator */}
                      <Box
                        position="absolute"
                        bottom={0}
                        right={0}
                        w={4}
                        h={4}
                        bg="green.400"
                        rounded="full"
                        border="2px solid"
                        borderColor={welcomeBg}
                      />
                    </Box>
                  </MotionBox>

                  {/* Greeting */}
                  <MotionBox
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.3 }}
                    textAlign="center"
                  >
                    <Text
                      fontFamily="heading"
                      fontWeight="800"
                      fontSize={{ base: '2xl', md: '3xl' }}
                      letterSpacing="-0.03em"
                      color={textColor}
                      mb={2}
                    >
                      Hey{user?.name ? `, ${user.name.split(' ')[0]}` : ''}
                    </Text>
                    <Text color={subtleColor} fontSize={{ base: 'sm', md: 'md' }} maxW="400px" lineHeight="1.6">
                      I'm your AI companion. Ask me anything, use voice, or upload documents to chat about.
                    </Text>
                  </MotionBox>

                  {/* Suggested Prompts */}
                  <MotionBox
                    initial={{ y: 16, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, delay: 0.5 }}
                    w="full"
                    maxW="500px"
                  >
                    <VStack spacing={2} align="stretch">
                      {suggestedPrompts.map((prompt, i) => (
                        <Box
                          key={i}
                          as="button"
                          onClick={() => { setInputValue(prompt.text); }}
                          p={3.5}
                          rounded="xl"
                          bg={suggestBg}
                          border="1px solid"
                          borderColor={suggestBorder}
                          _hover={{
                            bg: suggestHoverBg,
                            borderColor: suggestHoverBorder,
                            transform: 'translateY(-1px)',
                          }}
                          transition="all 0.2s"
                          textAlign="left"
                          cursor="pointer"
                        >
                          <HStack spacing={3}>
                            <Box color="brand.500">{prompt.icon}</Box>
                            <Text fontSize="sm" color={subtleColor} fontWeight="500">
                              {prompt.text}
                            </Text>
                          </HStack>
                        </Box>
                      ))}
                    </VStack>
                  </MotionBox>
                </VStack>
              )}

              {/* Messages */}
              {messages.map((message, idx) => (
                <VStack key={message.id} spacing={3} align="stretch" w="full" className="msg-enter" style={{ animationDelay: `${idx * 0.05}s` }}>
                  {/* User Message */}
                  <HStack justify="flex-end" spacing={3} w="full" align="flex-end">
                    <VStack align="flex-end" spacing={1} maxW={{ base: '85%', md: '70%' }}>
                      <Box
                        bg={userBubbleBg}
                        color={userBubbleColor}
                        px={4}
                        py={3}
                        rounded="2xl"
                        roundedBottomRight="md"
                        maxW="100%"
                        w="fit-content"
                        ml="auto"
                        shadow="0 2px 8px rgba(245, 158, 11, 0.15)"
                      >
                        <Text fontSize="sm" fontWeight="500" lineHeight="1.6" color="surface.950" wordBreak="break-word">
                          {message.query}
                        </Text>
                      </Box>
                      <Text fontSize="xs" color={subtleColor} pr={1} opacity={0.7}>
                        {formatMessageTime(message.timestamp)}
                      </Text>
                    </VStack>
                  </HStack>

                  {/* AI Response */}
                  <HStack justify="flex-start" spacing={3} align="flex-start" w="full">
                    {/* AI Avatar */}
                    <Box flexShrink={0} mt={0.5}>
                      <NeuralLogo size={28} />
                    </Box>

                    <VStack align="flex-start" spacing={1} maxW={{ base: '85%', md: '75%' }} flex={1}>
                      <Box
                        bg={aiBubbleBg}
                        backdropFilter="blur(12px)"
                        px={4}
                        py={3}
                        rounded="2xl"
                        roundedTopLeft="md"
                        w="fit-content"
                        border="1px solid"
                        borderColor={aiBubbleBorder}
                      >
                        <Text
                          whiteSpace="pre-wrap"
                          fontSize="sm"
                          lineHeight="1.7"
                          color={textColor}
                        >
                          {message.response}
                        </Text>
                      </Box>

                      <HStack spacing={2} pl={1}>
                        <IconButton
                          aria-label={
                            isAudioLoading && playingMessageId === message.id
                              ? 'Loading...'
                              : playingMessageId === message.id
                              ? isAudioPaused ? 'Resume' : 'Pause'
                              : 'Play'
                          }
                          icon={
                            isAudioLoading && playingMessageId === message.id
                              ? <Spinner size="xs" />
                              : playingMessageId === message.id
                              ? isAudioPaused ? <FiVolume2 size={12} /> : <FiPause size={12} />
                              : <FiVolume2 size={12} />
                          }
                          size="xs"
                          variant="ghost"
                          color={playingMessageId === message.id ? 'brand.500' : subtleColor}
                          rounded="md"
                          disabled={isAudioLoading && playingMessageId === message.id}
                          _hover={{ color: 'brand.500', bg: audioHoverBg }}
                          onClick={async () => {
                            if (playingMessageId === message.id) {
                              if (isAudioPaused) await resumeCurrentAudio();
                              else pauseCurrentAudio();
                            } else if (message.audioUrl) {
                              await playMessageAudio(message.id, message.audioUrl, true);
                            } else {
                              await synthesizeText(message.response, message.id, true);
                            }
                          }}
                        />
                        {playingMessageId === message.id && audioDuration > 0 && (
                          <Text fontSize="xs" color={subtleColor} fontFamily="mono" opacity={0.7}>
                            {formatAudioTime(audioCurrentTime, audioDuration)}
                          </Text>
                        )}
                        <Text fontSize="xs" color={subtleColor} opacity={0.5}>
                          {formatMessageTime(message.timestamp)}
                        </Text>
                      </HStack>
                    </VStack>
                  </HStack>
                </VStack>
              ))}

              {/* Thinking Indicator — hide once streaming response text starts appearing */}
              {isLoading && !(messages.length > 0 && messages[messages.length - 1].user_id === '' && messages[messages.length - 1].response.length > 0) && (
                <MotionBox
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <HStack spacing={3} align="flex-start" w="full">
                    <Box flexShrink={0} className="pulse-glow">
                      <NeuralLogo size={28} />
                    </Box>
                    <Box
                      bg={aiBubbleBg}
                      backdropFilter="blur(12px)"
                      px={5}
                      py={3.5}
                      rounded="2xl"
                      roundedTopLeft="md"
                      border="1px solid"
                      borderColor={aiBubbleBorder}
                    >
                      <div className="thinking-dots">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </Box>
                  </HStack>
                </MotionBox>
              )}

              <div ref={messagesEndRef} />
            </VStack>
          </Box>
        </Box>

        {/* Input Area */}
        <Box px={{ base: 3, md: 6, lg: 8 }} pb={{ base: 3, md: 4 }} pt={2}>
          <Box maxW="800px" mx="auto">
            {/* Document context */}
            {selectedDocuments.length > 0 && (
              <HStack
                mb={2}
                p={2.5}
                rounded="xl"
                bg={docContextBg}
                border="1px solid"
                borderColor={docContextBorder}
                justify="space-between"
                fontSize="xs"
              >
                <HStack spacing={2}>
                  <FiFile size={13} color="#f59e0b" />
                  <Text fontWeight="600" color={textColor}>
                    {selectedDocuments.length} doc{selectedDocuments.length > 1 ? 's' : ''} attached
                  </Text>
                </HStack>
                {onDocumentSelectionChange && (
                  <IconButton
                    aria-label="Clear"
                    icon={<FiX size={13} />}
                    size="xs"
                    variant="ghost"
                    onClick={() => onDocumentSelectionChange([])}
                    color={subtleColor}
                    _hover={{ color: 'red.400' }}
                  />
                )}
              </HStack>
            )}

            {/* Input Bar */}
            <HStack
              bg={inputBg}
              backdropFilter="blur(16px) saturate(1.2)"
              rounded="2xl"
              border="1.5px solid"
              borderColor={inputBorderColor}
              p={2}
              spacing={2}
              _focusWithin={{
                borderColor: inputFocusBorder,
                boxShadow: '0 0 0 2px rgba(245, 158, 11, 0.08)',
              }}
              transition="all 0.2s"
            >
              <Input
                value={inputValue}
                onChange={handleInputChange}
                onKeyPress={handleKeyPress}
                onFocus={handleInputFocus}
                placeholder="Message CCRIPTER..."
                disabled={isLoading}
                variant="unstyled"
                size="md"
                fontSize="sm"
                px={3}
                _placeholder={{ color: placeholderColor }}
                color={textColor}
              />

              <HStack spacing={1}>
                <FileUpload
                  onFileUploaded={(document: Document) => {
                    toast({
                      title: 'Document uploaded',
                      description: `${document.filename} attached to chat`,
                      status: 'success',
                      duration: 2000,
                    });
                    // Auto-select the uploaded document for chat context
                    if (onDocumentSelectionChange && !selectedDocuments.includes(document.id)) {
                      onDocumentSelectionChange([...selectedDocuments, document.id]);
                    }
                  }}
                  isDisabled={isLoading}
                />

                <IconButton
                  aria-label="Voice"
                  icon={<FiMic size={16} />}
                  onClick={handleVoiceButtonClick}
                  variant="ghost"
                  size="sm"
                  disabled={isLoading}
                  color={subtleColor}
                  rounded="xl"
                  _hover={{ color: 'brand.500', bg: audioHoverBg }}
                />

                <IconButton
                  aria-label="Send"
                  icon={<FiSend size={16} />}
                  onClick={sendMessage}
                  size="sm"
                  rounded="xl"
                  disabled={isLoading || !inputValue.trim()}
                  bg="brand.500"
                  color="surface.950"
                  _hover={{
                    bg: 'brand.400',
                    transform: 'scale(1.05)',
                  }}
                  _active={{ transform: 'scale(0.95)' }}
                  _disabled={{ opacity: 0.4, cursor: 'not-allowed', transform: 'none' }}
                  transition="all 0.15s"
                />
              </HStack>
            </HStack>

            <Text textAlign="center" fontSize="xs" color={subtleColor} mt={2} opacity={0.5}>
              CCRIPTER can make mistakes. Verify important info.
            </Text>
          </Box>
        </Box>
      </MotionFlex>

      {/* Recording Modal */}
      <Modal isOpen={isRecordingModalOpen} onClose={() => {}} closeOnOverlayClick={false}>
        <ModalOverlay bg="blackAlpha.700" backdropFilter="blur(8px)" />
        <ModalContent bg={recordingModalBg} rounded="2xl" mx={4} maxW="360px">
          <ModalBody p={8}>
            <VStack spacing={6}>
              <VStack spacing={2}>
                <Text fontFamily="heading" fontSize="lg" fontWeight="700" color={textColor}>
                  Listening...
                </Text>
                <Text color={subtleColor} fontSize="sm">
                  Speak now
                </Text>
              </VStack>

              {/* Recording Wave */}
              <Box>
                <div className="recording-wave">
                  <span></span><span></span><span></span><span></span>
                  <span></span><span></span><span></span>
                </div>
              </Box>

              <Text fontFamily="mono" fontSize="2xl" fontWeight="600" color={textColor}>
                {formatTime(recordingTime)}
              </Text>

              <HStack spacing={4}>
                <IconButton
                  aria-label="Cancel"
                  icon={<FiX size={20} />}
                  onClick={cancelRecording}
                  variant="ghost"
                  size="lg"
                  rounded="full"
                  color={subtleColor}
                  _hover={{ color: 'red.400', bg: cancelHoverBg }}
                />
                <IconButton
                  aria-label="Send"
                  icon={<FiCheck size={20} />}
                  onClick={stopRecording}
                  size="lg"
                  rounded="full"
                  bg="brand.500"
                  color="surface.950"
                  _hover={{ bg: 'brand.400', transform: 'scale(1.05)' }}
                  shadow="0 4px 20px rgba(245, 158, 11, 0.3)"
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
