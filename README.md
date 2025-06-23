# Whisper Live Transcription App

A real-time audio transcription application that uses Faster Whisper to provide live speech-to-text with automatic language detection and streaming capabilities.

## Features

- 🎤 **Live Audio Streaming**: Real-time audio capture and processing
- 🌍 **Automatic Language Detection**: Faster Whisper automatically detects the spoken language
- 📝 **Live Transcription**: See transcriptions appear in real-time as you speak
- 🔄 **Streaming Updates**: Continuous processing every 2 seconds during recording
- 🎨 **Modern UI**: Clean, responsive interface built with React and Material-UI
- ⚡ **Fast Processing**: Optimized with Faster Whisper for improved performance
- 🔧 **Debug Tools**: Built-in testing and debugging capabilities

## Tech Stack

### Backend
- **Flask**: Python web framework
- **Flask-SocketIO**: Real-time WebSocket communication with threading mode
- **Faster Whisper**: High-performance speech recognition and language detection
- **NumPy**: Audio data processing
- **Pydub**: Audio format handling and conversion
- **Wave**: WAV file processing for Whisper input

### Frontend
- **React**: User interface framework
- **TypeScript**: Type-safe JavaScript
- **Socket.IO Client**: Real-time communication
- **Web Audio API**: Browser-based audio recording and processing
- **Material-UI**: Modern UI components

## Prerequisites

- Python 3.8+
- Node.js 16+
- Microphone access in your browser

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd whisper_live_practice
   ```

2. **Install Python dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Install Node.js dependencies**
   ```bash
   npm install
   ```

## Usage

1. **Start the backend server**
   ```bash
   python app.py
   ```
   The Flask server will start on `http://localhost:5001`

2. **Start the frontend development server**
   ```bash
   npm start
   ```
   The React app will start on `http://localhost:3000`

3. **Open your browser**
   Navigate to `http://localhost:3000`

4. **Grant microphone permissions**
   When prompted, allow the browser to access your microphone

5. **Choose your transcription mode**
   - **Record & Transcribe**: Record audio files and get transcriptions
   - **Live Transcription**: Real-time streaming transcription

6. **For Live Transcription**
   - Click "Start Live Transcription"
   - Speak into your microphone
   - Watch transcriptions appear in real-time
   - Click "Stop Transcription" when finished

## How It Works

### Live Transcription Mode
1. **Audio Capture**: Frontend captures audio using Web Audio API with 16kHz sample rate
2. **Chunk Processing**: Audio is processed in 4096-sample chunks and buffered
3. **Streaming**: Every 2 seconds, accumulated audio is sent to the backend
4. **Whisper Processing**: Faster Whisper processes the audio chunks
5. **Real-time Updates**: Results are streamed back via WebSocket
6. **Display**: Transcriptions appear in the UI with automatic language detection

### Record & Transcribe Mode
1. **Audio Recording**: Record audio files using MediaRecorder API
2. **File Processing**: Audio is converted to base64 and sent to backend
3. **Whisper Processing**: Faster Whisper transcribes the complete audio file
4. **Results Display**: Transcription and language detection results are shown

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /` - Serve the main application

### WebSocket Events
- `connect` - Client connection established
- `disconnect` - Client disconnection
- `audio_chunk` - Live audio data streaming
- `transcribe_audio` - Audio file transcription request
- `test_message` - Test WebSocket communication
- `transcription` - Real-time transcription results
- `transcription_result` - File transcription results

## Configuration

The application uses the following default settings:
- **Audio Sample Rate**: 16kHz (Whisper requirement)
- **Processing Interval**: 2 seconds for live transcription
- **Whisper Model**: "base" (good balance of speed and accuracy)
- **Audio Format**: WAV for processing, WebM for recording
- **Socket.IO Mode**: Threading (compatible with audio processing)

## Troubleshooting

### Common Issues

1. **Microphone not working**
   - Ensure you've granted microphone permissions to the browser
   - Check that your microphone is properly connected and working
   - Try refreshing the page and granting permissions again

2. **No transcriptions appearing**
   - Check the browser console for debug messages
   - Verify that both servers are running
   - Use the "Test Connection" button to verify WebSocket communication
   - Use the "Test Handler" button to verify transcription display

3. **Slow processing**
   - The first transcription may take longer as the Faster Whisper model loads
   - Subsequent transcriptions should be faster
   - Ensure you're speaking clearly and loudly enough

4. **Audio quality issues**
   - Try speaking more clearly and reducing background noise
   - Ensure your microphone is positioned correctly
   - Check that echo cancellation and noise suppression are enabled

### Debug Mode

The application includes comprehensive debug logging:
- **Backend**: Check the terminal where you started the Flask server
- **Frontend**: Open browser developer tools and check the console
- **Test Functions**: Use the built-in test buttons to verify functionality

## Development

### Project Structure
```
whisper_live_practice/
├── app.py                    # Flask backend server
├── requirements.txt          # Python dependencies
├── package.json             # Node.js dependencies
├── src/
│   ├── App.tsx              # Main React component with tabs
│   ├── components/
│   │   └── LiveTranscription.tsx  # Live transcription component
│   └── index.tsx            # React entry point
├── public/
│   └── index.html           # HTML template
└── README.md                # This file
```

### Key Components

- **LiveTranscription.tsx**: Handles real-time audio streaming and transcription
- **App.tsx**: Main application with tabbed interface
- **app.py**: Backend server with Faster Whisper integration

### Adding Features

- **New Audio Formats**: Modify the audio processing in `process_audio_file()` and `process_audio_buffer()`
- **Different Whisper Models**: Change the model in `load_whisper_model()` (e.g., "large", "medium", "small")
- **UI Enhancements**: Modify the React components in `src/`
- **Additional Languages**: Faster Whisper supports 99+ languages automatically

## Performance Notes

- **Faster Whisper**: Provides 4x faster inference than OpenAI Whisper
- **Memory Usage**: Uses int8 quantization for reduced memory footprint
- **Real-time Processing**: Optimized for low-latency streaming transcription
- **Multi-client Support**: Handles multiple simultaneous users

## License

This project is open source and available under the MIT License.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly with both live and file transcription modes
5. Submit a pull request

## Acknowledgments

- [Faster Whisper](https://github.com/SYSTRAN/faster-whisper) for high-performance speech recognition
- OpenAI for the original Whisper model
- The Flask and React communities for excellent documentation
- Contributors and users of this project 