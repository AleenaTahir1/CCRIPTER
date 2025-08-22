import React from 'react';
import { Box, Container, useColorModeValue } from '@chakra-ui/react';
import Chat from './components/Chat';

function App() {
  const bgGradient = useColorModeValue(
    'linear(to-b, brand.50, white)',
    'linear(to-b, gray.900, gray.800)'
  );
  const textColor = useColorModeValue('gray.800', 'gray.100');
  return (
    <Box bgGradient={bgGradient} minH="100vh" color={textColor}>
      <Container maxW="5xl" py={6}>
        <Chat />
      </Container>
    </Box>
  );
}

export default App;
