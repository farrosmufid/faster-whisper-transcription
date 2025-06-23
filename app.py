import os
import io
import base64
import numpy as np
import wave
import tempfile
import logging
import threading
import time
from collections import deque
from flask import Flask, request, jsonify
from flask_socketio import SocketIO, emit
from flask_cors import CORS
from faster_whisper import WhisperModel
from pydub import AudioSegment

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.config['SECRET_KEY'] = 'your-secret-key-here'
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global variables
whisper_model = None
audio_buffers = {}  # Store audio buffers per client
buffer_lock = threading.Lock()

def load_whisper_model():
    """Load Faster Whisper model for language detection and transcription"""
    global whisper_model
    try:
        logger.info("Loading Faster Whisper model...")
        # Use base.en for English or base for multilingual
        whisper_model = WhisperModel("base", compute_type="int8")
        logger.info("Faster Whisper model loaded successfully")
    except Exception as e:
        logger.error(f"Failed to load Faster Whisper model: {e}")
        raise

def process_audio_file(audio_data):
    """Process audio file with Faster Whisper"""
    try:
        if whisper_model is None:
            logger.error("Faster Whisper model not loaded")
            return None, None
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(suffix='.webm', delete=False) as temp_file:
            temp_file.write(audio_data)
            temp_file_path = temp_file.name
        
        try:
            # Load audio with pydub
            audio = AudioSegment.from_file(temp_file_path)
            
            # Convert to mono if stereo
            if audio.channels > 1:
                audio = audio.set_channels(1)
            
            # Convert to 16kHz sample rate (Whisper expects 16kHz)
            if audio.frame_rate != 16000:
                audio = audio.set_frame_rate(16000)
            
            # Export as WAV for faster-whisper
            wav_path = temp_file_path.replace('.webm', '.wav')
            audio.export(wav_path, format='wav')
            
            # Process with Faster Whisper
            segments, info = whisper_model.transcribe(wav_path, language=None, task="transcribe")
            
            # Get the full transcript
            transcript = " ".join([segment.text for segment in segments]).strip()
            detected_language = info.language if hasattr(info, 'language') else 'unknown'
            
            logger.info(f"Detected language: {detected_language}, Transcript: {transcript}")
            
            return detected_language, transcript
            
        finally:
            # Clean up temporary files
            try:
                os.unlink(temp_file_path)
                if os.path.exists(wav_path):
                    os.unlink(wav_path)
            except:
                pass
                
    except Exception as e:
        logger.error(f"Error processing audio: {e}")
        return None, None

def process_audio_buffer(client_id):
    """Process accumulated audio buffer for a client"""
    try:
        print(f"🟢 DEBUG: Starting process_audio_buffer for {client_id}")
        
        with buffer_lock:
            if client_id not in audio_buffers or len(audio_buffers[client_id]) == 0:
                print(f"🔴 DEBUG: No audio buffer for {client_id}")
                return
            
            # Get accumulated audio data
            audio_data = b''.join(audio_buffers[client_id])
            audio_buffers[client_id].clear()
            print(f"🟢 DEBUG: Processing {len(audio_data)} bytes of audio for {client_id}")
        
        if len(audio_data) < 16000:  # Less than 1 second of audio
            print(f"🟡 DEBUG: Audio too short for {client_id}: {len(audio_data)} bytes")
            return
        
        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmpfile:
            with wave.open(tmpfile.name, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(16000)
                wf.writeframes(audio_data)
            
            print(f"🟢 DEBUG: Created WAV file for {client_id}: {tmpfile.name}")
            
            # Process with Faster Whisper
            print(f"🟢 DEBUG: Starting Whisper transcription for {client_id}")
            segments, info = whisper_model.transcribe(tmpfile.name)
            
            # Send transcribed text
            transcript = " ".join([segment.text for segment in segments]).strip()
            print(f"🟢 DEBUG: Transcription result for {client_id}: '{transcript}'")
            
            if transcript:
                print(f"🟢 DEBUG: Sending transcription to {client_id}: {transcript}")
                
                # Check if client is still connected
                try:
                    socketio.emit('transcription', {'text': transcript}, room=client_id)
                    print(f"✅ DEBUG: Successfully sent transcription to {client_id}")
                except Exception as e:
                    print(f"🔴 DEBUG: Failed to send transcription to {client_id}: {e}")
            else:
                print(f"🟡 DEBUG: No transcript generated for {client_id}")
            
    except Exception as e:
        print(f"🔴 DEBUG: Error processing audio buffer for {client_id}: {e}")
        logger.error(f"Error processing audio buffer for {client_id}: {e}")
        import traceback
        print(f"🔴 DEBUG: Traceback: {traceback.format_exc()}")

@socketio.on('connect')
def handle_connect():
    """Handle client connection"""
    client_id = request.sid
    print(f"🟢 DEBUG: Client connected: {client_id}")
    logger.info(f"Client connected: {client_id}")
    
    # Initialize audio buffer for this client
    with buffer_lock:
        audio_buffers[client_id] = deque(maxlen=10)  # Keep last 10 chunks
        print(f"🟢 DEBUG: Initialized audio buffer for {client_id}")
    
    # List all registered event handlers
    print(f"🟢 DEBUG: Registered event handlers: {list(socketio.server.handlers.keys())}")
    
    emit('connected', {'status': 'connected'})
    
    # Send a test transcription after a short delay to verify event listener is working
    def send_test_transcription():
        import time
        time.sleep(1)  # Wait 1 second for client to set up event listeners
        print(f"🟢 DEBUG: Sending test transcription to {client_id} after connection")
        socketio.emit('transcription', {'text': 'Connection test transcription'}, room=client_id)
        print(f"✅ DEBUG: Test transcription sent to {client_id}")
    
    threading.Thread(target=send_test_transcription).start()

@socketio.on('disconnect')
def handle_disconnect():
    """Handle client disconnection"""
    client_id = request.sid
    print(f"🔴 DEBUG: Client disconnected: {client_id}")
    logger.info(f"Client disconnected: {client_id}")
    
    # Clean up audio buffer
    with buffer_lock:
        if client_id in audio_buffers:
            del audio_buffers[client_id]
            print(f"🟢 DEBUG: Cleaned up audio buffer for {client_id}")
        else:
            print(f"🟡 DEBUG: No audio buffer found for {client_id} during disconnect")

@socketio.on('audio_chunk')
def handle_audio_chunk(data):
    """Handle live audio chunk for transcription"""
    try:
        client_id = request.sid
        print(f"🔵 DEBUG: Received audio chunk from {client_id}: {len(data)} bytes")
        
        # Add audio chunk to buffer
        with buffer_lock:
            if client_id in audio_buffers:
                audio_buffers[client_id].append(data)
                print(f"🔵 DEBUG: Buffer size for {client_id}: {len(audio_buffers[client_id])}")
            else:
                print(f"🔴 DEBUG: No audio buffer found for {client_id}")
        
        # Process buffer if it has enough data (about 2 seconds worth)
        current_buffer_size = len(audio_buffers.get(client_id, []))
        print(f"🔵 DEBUG: Current buffer size: {current_buffer_size}")
        
        if current_buffer_size >= 2:
            print(f"🟢 DEBUG: Processing buffer for {client_id} - buffer size: {current_buffer_size}")
            # Process in a separate thread to avoid blocking
            threading.Thread(target=process_audio_buffer, args=(client_id,)).start()
        else:
            print(f"🟡 DEBUG: Not enough audio yet for {client_id} - need 2, have {current_buffer_size}")
        
    except Exception as e:
        print(f"🔴 DEBUG: Error handling audio chunk: {e}")
        logger.error(f"Error handling audio chunk: {e}")
        import traceback
        print(f"🔴 DEBUG: Traceback: {traceback.format_exc()}")

@socketio.on('transcribe_audio')
def handle_transcribe_audio(data):
    """Handle audio transcription request"""
    try:
        # Decode base64 audio data
        audio_data = base64.b64decode(data['audio'])
        
        logger.info(f"Received audio for transcription: {len(audio_data)} bytes")
        
        # Process audio
        detected_language, transcript = process_audio_file(audio_data)
        
        if detected_language and transcript:
            emit('transcription_result', {
                'language': detected_language,
                'transcript': transcript,
                'success': True
            })
        else:
            emit('transcription_result', {
                'language': 'unknown',
                'transcript': '',
                'success': False,
                'error': 'Failed to transcribe audio'
            })
        
    except Exception as e:
        logger.error(f"Error handling transcription request: {e}")
        emit('transcription_result', {
            'language': 'error',
            'transcript': '',
            'success': False,
            'error': str(e)
        })

@socketio.on('test_message')
def handle_test_message(data):
    """Handle test message to verify WebSocket communication"""
    client_id = request.sid
    print(f"🟢 DEBUG: Received test message from {client_id}: {data}")
    
    # Send test response
    print(f"🟢 DEBUG: Sending test response to {client_id}")
    emit('test_response', {'message': 'Test response received', 'data': data})
    print(f"✅ DEBUG: Test response sent to {client_id}")
    
    # Also send a test transcription to verify the transcription handler
    print(f"🟢 DEBUG: Sending test transcription to {client_id}")
    emit('transcription', {'text': 'This is a test transcription from server'})
    print(f"✅ DEBUG: Test transcription sent to {client_id}")
    
    # List all connected clients
    print(f"🟢 DEBUG: All connected clients: {list(socketio.server.rooms.keys())}")
    print(f"🟢 DEBUG: Current client rooms: {socketio.server.rooms}")

@app.route('/health')
def health_check():
    """Health check endpoint"""
    return jsonify({'status': 'healthy', 'whisper_loaded': whisper_model is not None})

@app.route('/')
def index():
    """Serve the main page"""
    return app.send_static_file('index.html')

if __name__ == '__main__':
    # Load Faster Whisper model on startup
    load_whisper_model()
    
    # Run the app
    socketio.run(app, host='0.0.0.0', port=5001, debug=True) 