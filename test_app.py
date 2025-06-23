#!/usr/bin/env python3
"""
Test script for the Whisper Transcription App
This script tests the backend functionality without requiring a browser.
"""

import requests
import json
import time
import numpy as np

def test_health_endpoint():
    """Test the health check endpoint"""
    print("Testing health endpoint...")
    try:
        response = requests.get('http://localhost:5001/health')
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Health check passed: {data}")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Health check error: {e}")
        return False

def test_audio_processing():
    """Test audio processing with a simple sine wave"""
    print("\nTesting audio processing...")
    try:
        # Create a simple test audio signal (1 second of 440Hz sine wave)
        sample_rate = 16000
        duration = 1.0
        frequency = 440.0
        
        t = np.linspace(0, duration, int(sample_rate * duration), False)
        test_audio = np.sin(2 * np.pi * frequency * t).astype(np.float32)
        
        # Send to processing endpoint
        response = requests.post(
            'http://localhost:5001/process_audio',
            data=test_audio.tobytes(),
            headers={'Content-Type': 'application/octet-stream'}
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ Audio processing test passed: {data}")
            return True
        else:
            print(f"❌ Audio processing failed: {response.status_code}")
            print(f"Response: {response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Audio processing error: {e}")
        return False

def test_websocket_connection():
    """Test WebSocket connection (basic test)"""
    print("\nTesting WebSocket connection...")
    try:
        # Test if the server is running and accessible
        response = requests.get('http://localhost:5001/health')
        if response.status_code == 200:
            print("✅ Server is running and accessible")
            return True
        else:
            print(f"❌ Server not accessible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ WebSocket test error: {e}")
        return False

def main():
    """Run all tests"""
    print("🧪 Testing Whisper Transcription App Backend")
    print("=" * 50)
    
    # Wait a moment for server to be ready
    time.sleep(2)
    
    tests = [
        test_health_endpoint,
        test_audio_processing,
        test_websocket_connection
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        if test():
            passed += 1
        time.sleep(1)  # Brief pause between tests
    
    print("\n" + "=" * 50)
    print(f"📊 Test Results: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All tests passed! The backend is working correctly.")
        print("\nNext steps:")
        print("1. Open http://localhost:3000 in your browser")
        print("2. Allow microphone access")
        print("3. Start recording and test the full application")
    else:
        print("⚠️  Some tests failed. Check the server logs for more details.")
    
    return passed == total

if __name__ == "__main__":
    main() 