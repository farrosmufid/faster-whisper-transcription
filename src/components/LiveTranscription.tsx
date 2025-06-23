import React, { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Clear as ClearIcon,
  RecordVoiceOver as RecordVoiceOverIcon
} from '@mui/icons-material';

interface TranscriptionData {
  text: string;
}

const LiveTranscription: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioBufferRef = useRef<Int16Array[]>([]);
  const lastSendTimeRef = useRef<number>(0);
  const isRecordingRef = useRef<boolean>(false);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('🟢 DEBUG: Connected to server for live transcription');
      setIsConnected(true);
      setError('');
      
      // Set up event listeners after connection is established
      console.log('🟢 DEBUG: Setting up event listeners');
      
      newSocket.on('transcription', (data: TranscriptionData) => {
        console.log('🟢 DEBUG: Received live transcription event:', data);
        console.log('🟢 DEBUG: Event data type:', typeof data);
        console.log('🟢 DEBUG: Event data keys:', Object.keys(data || {}));
        console.log('🟢 DEBUG: Event data text:', data?.text);
        console.log('🟢 DEBUG: Event data text type:', typeof data?.text);
        
        if (data && data.text && data.text.trim()) {
          console.log(`✅ DEBUG: Adding transcript: "${data.text.trim()}"`);
          setTranscript((prev) => {
            const newTranscript = prev + ' ' + data.text.trim();
            console.log(`✅ DEBUG: Updated transcript: "${newTranscript}"`);
            return newTranscript;
          });
        } else {
          console.log('🟡 DEBUG: Received empty or invalid transcription data:', data);
        }
      });

      newSocket.on('test_response', (data) => {
        console.log('🟢 DEBUG: Received test response:', data);
      });

      newSocket.on('connected', (data) => {
        console.log('🟢 DEBUG: Received connected event:', data);
      });
    });

    newSocket.on('disconnect', () => {
      console.log('🔴 DEBUG: Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🔴 DEBUG: Connection error:', error);
      setError('Failed to connect to server. Please check if the Flask server is running.');
    });

    setSocket(newSocket);

    return () => {
      console.log('🟢 DEBUG: Cleaning up socket connection');
      newSocket.close();
    };
  }, []);

  const startLiveTranscription = async () => {
    try {
      console.log('🟢 DEBUG: Starting live transcription...');
      setError('');
      setIsLoading(true);

      // Request microphone access
      console.log('🟢 DEBUG: Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      console.log('✅ DEBUG: Microphone access granted');
      streamRef.current = stream;

      // Create AudioContext with 16kHz sample rate
      console.log('🟢 DEBUG: Creating AudioContext...');
      const audioContext = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioContext;

      const source = audioContext.createMediaStreamSource(stream);
      
      // Create ScriptProcessor for audio processing
      console.log('🟢 DEBUG: Creating ScriptProcessor...');
      const processor = audioContext.createScriptProcessor(4096, 1, 1);
      processorRef.current = processor;

      source.connect(processor);
      processor.connect(audioContext.destination);

      // Initialize audio buffer
      audioBufferRef.current = [];
      lastSendTimeRef.current = Date.now();
      console.log('✅ DEBUG: Audio processing setup complete');

      processor.onaudioprocess = (e) => {
        console.log('🔵 DEBUG: Audio process triggered, isRecording:', isRecordingRef.current, 'socket:', !!socket);
        if (socket && isRecordingRef.current) {
          const input = e.inputBuffer.getChannelData(0);
          const pcm = new Int16Array(input.length);
          
          // Convert float32 to int16
          for (let i = 0; i < input.length; i++) {
            let s = Math.max(-1, Math.min(1, input[i]));
            pcm[i] = s * 32767;
          }
          
          // Add to buffer
          audioBufferRef.current.push(pcm);
          console.log(`🔵 DEBUG: Added audio chunk, buffer size: ${audioBufferRef.current.length}`);
          
          // Send audio chunks every 2 seconds (about 8 chunks of 4096 samples each)
          const now = Date.now();
          if (now - lastSendTimeRef.current > 2000 && audioBufferRef.current.length >= 8) {
            // Combine all chunks
            const totalLength = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
            const combined = new Int16Array(totalLength);
            let offset = 0;
            
            for (const chunk of audioBufferRef.current) {
              combined.set(chunk, offset);
              offset += chunk.length;
            }
            
            // Send to server
            console.log(`🟢 DEBUG: Sending audio chunk: ${combined.length} samples`);
            socket.emit('audio_chunk', combined.buffer);
            console.log(`✅ DEBUG: Audio chunk sent successfully`);
            
            // Clear buffer and update time
            audioBufferRef.current = [];
            lastSendTimeRef.current = now;
          }
        } else {
          console.log('🟡 DEBUG: Audio process triggered but not recording or no socket');
        }
      };

      setIsRecording(true);
      isRecordingRef.current = true;
      setIsLoading(false);
      console.log('✅ DEBUG: Live transcription started successfully');

    } catch (err) {
      console.error('🔴 DEBUG: Error starting live transcription:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsLoading(false);
    }
  };

  const stopLiveTranscription = () => {
    console.log('🟢 DEBUG: Stopping live transcription...');
    setIsRecording(false);
    isRecordingRef.current = false;
    
    // Send any remaining audio in buffer
    if (socket && audioBufferRef.current.length > 0) {
      const totalLength = audioBufferRef.current.reduce((sum, chunk) => sum + chunk.length, 0);
      const combined = new Int16Array(totalLength);
      let offset = 0;
      
      for (const chunk of audioBufferRef.current) {
        combined.set(chunk, offset);
        offset += chunk.length;
      }
      
      socket.emit('audio_chunk', combined.buffer);
      audioBufferRef.current = [];
    }
    
    // Clean up audio processing
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    console.log('✅ DEBUG: Live transcription stopped');
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  const testWebSocket = () => {
    if (socket) {
      console.log('🟢 DEBUG: Sending test message to server');
      console.log('🟢 DEBUG: Socket connected state:', socket.connected);
      console.log('🟢 DEBUG: Socket ID:', socket.id);
      socket.emit('test_message', { test: 'Hello from frontend' });
      console.log('✅ DEBUG: Test message sent');
    } else {
      console.log('🔴 DEBUG: No socket connection');
    }
  };

  const testTranscriptionHandler = () => {
    console.log('🟢 DEBUG: Testing transcription handler manually');
    console.log('🟢 DEBUG: Current transcript state:', transcript);
    // Manually trigger the transcription handler with test data
    const testData = { text: 'Manual test transcription' };
    console.log('🟢 DEBUG: Manually triggering transcription handler with:', testData);
    
    // Simulate the event handler being called
    if (testData && testData.text && testData.text.trim()) {
      console.log(`✅ DEBUG: Adding manual test transcript: "${testData.text.trim()}"`);
      setTranscript((prev) => {
        const newTranscript = prev + ' ' + testData.text.trim();
        console.log(`✅ DEBUG: Updated transcript: "${newTranscript}"`);
        return newTranscript;
      });
    }
  };

  return (
    <Box>
      <Typography variant="h4" component="h2" gutterBottom>
        <RecordVoiceOverIcon sx={{ fontSize: 32, mr: 1, color: 'primary.main' }} />
        Live Transcription
      </Typography>

      {/* Connection Status */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
          />
          {isRecording && (
            <Chip
              label="Recording"
              color="error"
              variant="outlined"
              icon={<CircularProgress size={16} />}
            />
          )}
        </Stack>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Recording Controls */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
          <Button
            variant="contained"
            color="primary"
            size="large"
            startIcon={isLoading ? <CircularProgress size={20} /> : <MicIcon />}
            onClick={startLiveTranscription}
            disabled={!isConnected || isRecording || isLoading}
            sx={{ minWidth: 150 }}
          >
            {isLoading ? 'Starting...' : 'Start Live Transcription'}
          </Button>

          <Button
            variant="contained"
            color="error"
            size="large"
            startIcon={<StopIcon />}
            onClick={stopLiveTranscription}
            disabled={!isRecording}
            sx={{ minWidth: 150 }}
          >
            Stop Transcription
          </Button>

          <Button
            variant="outlined"
            color="secondary"
            startIcon={<ClearIcon />}
            onClick={clearTranscript}
            disabled={transcript.length === 0}
            size="large"
          >
            Clear
          </Button>

          <Button
            variant="outlined"
            color="info"
            onClick={testWebSocket}
            size="large"
          >
            Test Connection
          </Button>

          <Button
            variant="outlined"
            color="warning"
            onClick={testTranscriptionHandler}
            size="large"
          >
            Test Handler
          </Button>
        </Stack>
      </Paper>

      {/* Live Transcript Display */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h5" gutterBottom>
          Live Transcript
        </Typography>
        
        <Card variant="outlined">
          <CardContent>
            {transcript.length === 0 ? (
              <Typography variant="body1" color="text.secondary" textAlign="center" py={4}>
                {isRecording 
                  ? '🎤 Recording... Speak to see live transcription'
                  : 'Click "Start Live Transcription" to begin'
                }
              </Typography>
            ) : (
              <Typography 
                variant="body1" 
                sx={{ 
                  whiteSpace: 'pre-wrap', 
                  minHeight: '200px',
                  lineHeight: 1.6
                }}
              >
                {transcript}
              </Typography>
            )}
          </CardContent>
        </Card>
      </Paper>
    </Box>
  );
};

export default LiveTranscription; 