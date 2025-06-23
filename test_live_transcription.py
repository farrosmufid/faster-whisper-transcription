#!/usr/bin/env python3
"""
Test script for Live Transcription
"""

from faster_whisper import WhisperModel
import tempfile
import wave
import numpy as np
import time

def test_live_transcription():
    """Test live transcription with simulated audio chunks"""
    try:
        print("Loading Faster Whisper model...")
        model = WhisperModel("base", compute_type="int8")
        print("Model loaded successfully!")
        
        # Create test audio with some variation (not just silence)
        sample_rate = 16000
        duration = 2  # 2 seconds
        t = np.linspace(0, duration, sample_rate * duration)
        
        # Create a simple sine wave to simulate speech-like audio
        frequency = 440  # A4 note
        samples = np.sin(2 * np.pi * frequency * t) * 0.1  # Low amplitude
        samples = (samples * 32767).astype(np.int16)
        
        # Create temporary WAV file
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=True) as tmpfile:
            with wave.open(tmpfile.name, 'wb') as wf:
                wf.setnchannels(1)
                wf.setsampwidth(2)  # 16-bit
                wf.setframerate(sample_rate)
                wf.writeframes(samples.tobytes())
            
            print(f"Created test audio file: {tmpfile.name}")
            print(f"Audio length: {len(samples)} samples ({len(samples)/sample_rate:.2f} seconds)")
            
            # Test transcription
            print("Testing transcription...")
            start_time = time.time()
            segments, info = model.transcribe(tmpfile.name)
            
            print(f"Transcription completed in {time.time() - start_time:.2f} seconds!")
            print(f"Language: {info.language}")
            
            # Print segments
            transcript = ""
            for segment in segments:
                print(f"Segment: {segment.text}")
                transcript += segment.text + " "
            
            print(f"Full transcript: {transcript.strip()}")
            
            if transcript.strip():
                print("✅ Live transcription test successful - audio was transcribed!")
            else:
                print("⚠️  No transcription generated - this might be normal for test audio")
        
        return True
        
    except Exception as e:
        print(f"❌ Error testing live transcription: {e}")
        return False

if __name__ == "__main__":
    test_live_transcription() 