#!/usr/bin/env python3
"""
Test script for Faster Whisper
"""

from faster_whisper import WhisperModel
import tempfile
import wave
import numpy as np

def test_faster_whisper():
    """Test Faster Whisper with a simple audio file"""
    try:
        print("Loading Faster Whisper model...")
        model = WhisperModel("base", compute_type="int8")
        print("Model loaded successfully!")
        
        # Create a simple test audio (silence)
        sample_rate = 16000
        duration = 1  # 1 second
        samples = np.zeros(sample_rate * duration, dtype=np.int16)
        
        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmpfile:
            with wave.open(tmpfile.name, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(samples.tobytes())
            
            print(f"Created test audio file: {tmpfile.name}")
            
            # Test transcription
            print("Testing transcription...")
            segments, info = model.transcribe(tmpfile.name)
            
            print("Transcription completed!")
            print(f"Language: {info.language}")
            print(f"Segments: {len(list(segments))}")
            
            # Print segments
            for segment in segments:
                print(f"Segment: {segment.text}")
        
        print("✅ Faster Whisper test completed successfully!")
        return True
        
    except Exception as e:
        print(f"❌ Error testing Faster Whisper: {e}")
        return False

if __name__ == "__main__":
    test_faster_whisper() 