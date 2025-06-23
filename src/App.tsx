import React, { useState, useEffect, useRef } from 'react';
import {
  Box,
  Button,
  Container,
  Typography,
  Paper,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  IconButton,
  Card,
  CardContent,
  Divider,
  Tabs,
  Tab
} from '@mui/material';
import {
  Mic as MicIcon,
  Stop as StopIcon,
  Clear as ClearIcon,
  Language as LanguageIcon,
  RecordVoiceOver as RecordVoiceOverIcon,
  Radio as RadioIcon
} from '@mui/icons-material';
import { io, Socket } from 'socket.io-client';
import LiveTranscription from './components/LiveTranscription';
import './App.css';

interface TranscriptionResult {
  language: string;
  transcript: string;
  success: boolean;
  error?: string;
}

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const App: React.FC = () => {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcriptionResults, setTranscriptionResults] = useState<TranscriptionResult[]>([]);
  const [currentLanguage, setCurrentLanguage] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [tabValue, setTabValue] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Initialize Socket.IO connection
  useEffect(() => {
    const newSocket = io('http://localhost:5001', {
      transports: ['websocket', 'polling']
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setIsConnected(true);
      setError('');
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    newSocket.on('connected', (data) => {
      console.log('Server confirmed connection:', data);
    });

    newSocket.on('transcription_result', (data: TranscriptionResult) => {
      console.log('Received transcription result:', data);
      
      setIsProcessing(false);
      
      if (data.success) {
        setTranscriptionResults(prev => [...prev, data]);
        
        // Update current language if it's the first result or language changed
        if (data.language && (!currentLanguage || data.language !== currentLanguage)) {
          setCurrentLanguage(data.language);
        }
        
        console.log('Added transcription to results:', data.transcript);
      } else {
        setError(data.error || 'Failed to transcribe audio');
      }
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setError('Failed to connect to server. Please check if the Flask server is running.');
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, [currentLanguage]);

  const startRecording = async () => {
    try {
      setError('');
      setIsLoading(true);

      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true
        } 
      });

      // Create MediaRecorder with WebM format
      const mediaRecorder = new MediaRecorder(stream, { 
        mimeType: 'audio/webm;codecs=opus' 
      });

      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Handle audio data
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      // Add error handling
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        setError('Audio recording error occurred.');
        setIsLoading(false);
        setIsRecording(false);
      };

      // Add stop handling
      mediaRecorder.onstop = async () => {
        console.log('MediaRecorder stopped');
        setIsRecording(false);
        setIsLoading(false);
        
        // Process the recorded audio
        if (audioChunksRef.current.length > 0) {
          await processRecordedAudio();
        }
      };

      // Start recording
      mediaRecorder.start();
      setIsRecording(true);
      setIsLoading(false);

    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to access microphone. Please check permissions.');
      setIsLoading(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  const processRecordedAudio = async () => {
    try {
      setIsProcessing(true);
      
      // Combine all audio chunks into a single blob
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Convert to base64
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const base64Audio = (reader.result as string).split(',')[1];
          console.log(`Sending audio for transcription: ${base64Audio.length} chars`);
          
          // Send to server for transcription
          socket?.emit('transcribe_audio', { audio: base64Audio });
          
        } catch (err) {
          console.error('Error processing audio:', err);
          setError('Failed to process audio data.');
          setIsProcessing(false);
        }
      };
      reader.onerror = (err) => {
        console.error('Error reading audio:', err);
        setError('Failed to read audio data.');
        setIsProcessing(false);
      };
      reader.readAsDataURL(audioBlob);
      
    } catch (err) {
      console.error('Error processing recorded audio:', err);
      setError('Failed to process recorded audio.');
      setIsProcessing(false);
    }
  };

  const clearResults = () => {
    setTranscriptionResults([]);
    setCurrentLanguage('');
  };

  const getLanguageDisplayName = (languageCode: string): string => {
    const languageNames: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'ru': 'Russian',
      'ja': 'Japanese',
      'ko': 'Korean',
      'zh': 'Chinese',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'id': 'Indonesian',
      'ms': 'Malay',
      'th': 'Thai',
      'vi': 'Vietnamese'
    };
    return languageNames[languageCode] || languageCode.toUpperCase();
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box textAlign="center" mb={4}>
        <Typography variant="h3" component="h1" gutterBottom>
          <RecordVoiceOverIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          Whisper Transcription
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Audio transcription with Faster Whisper and live streaming
        </Typography>
      </Box>

      {/* Connection Status */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="center">
          <Chip
            label={isConnected ? 'Connected' : 'Disconnected'}
            color={isConnected ? 'success' : 'error'}
            icon={<LanguageIcon />}
          />
          {currentLanguage && (
            <Chip
              label={`Detected: ${getLanguageDisplayName(currentLanguage)}`}
              color="primary"
              variant="outlined"
            />
          )}
          {isProcessing && (
            <Chip
              label="Processing"
              color="warning"
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

      {/* Tab Navigation */}
      <Paper sx={{ mb: 3 }}>
        <Tabs 
          value={tabValue} 
          onChange={handleTabChange} 
          centered
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab 
            icon={<MicIcon />} 
            label="Record & Transcribe" 
            iconPosition="start"
          />
          <Tab 
            icon={<RadioIcon />} 
            label="Live Transcription" 
            iconPosition="start"
          />
        </Tabs>
      </Paper>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Recording Controls */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Stack direction="row" spacing={2} justifyContent="center" alignItems="center">
            <Button
              variant="contained"
              color="primary"
              size="large"
              startIcon={isLoading ? <CircularProgress size={20} /> : <MicIcon />}
              onClick={startRecording}
              disabled={!isConnected || isRecording || isLoading || isProcessing}
              sx={{ minWidth: 150 }}
            >
              {isLoading ? 'Starting...' : 'Start Recording'}
            </Button>

            <Button
              variant="contained"
              color="error"
              size="large"
              startIcon={<StopIcon />}
              onClick={stopRecording}
              disabled={!isRecording}
              sx={{ minWidth: 150 }}
            >
              Stop Recording
            </Button>

            <IconButton
              color="secondary"
              onClick={clearResults}
              disabled={transcriptionResults.length === 0}
              size="large"
            >
              <ClearIcon />
            </IconButton>
          </Stack>
        </Paper>

        {/* Transcription Results */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Transcription Results
          </Typography>
          <Divider sx={{ mb: 2 }} />
          
          {transcriptionResults.length === 0 ? (
            <Box textAlign="center" py={4}>
              <Typography variant="body1" color="text.secondary">
                {isRecording 
                  ? '🎤 Recording... Click "Stop Recording" when done'
                  : isProcessing
                  ? '🔄 Processing audio...'
                  : 'Click "Start Recording" to begin transcription'
                }
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {transcriptionResults.map((result, index) => (
                <Card key={index} variant="outlined">
                  <CardContent>
                    <Stack direction="row" spacing={2} alignItems="center" mb={1}>
                      <Chip
                        label={getLanguageDisplayName(result.language)}
                        color="primary"
                        size="small"
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date().toLocaleTimeString()}
                      </Typography>
                      {result.success && (
                        <Chip label="Success" color="success" size="small" />
                      )}
                    </Stack>
                    <Typography variant="body1">
                      {result.transcript}
                    </Typography>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        <LiveTranscription />
      </TabPanel>
    </Container>
  );
};

export default App; 