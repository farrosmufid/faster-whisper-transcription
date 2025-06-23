import whisper

# Load the model (choose from: tiny, base, small, medium, large)
model = whisper.load_model("base")

# Load and preprocess the audio
audio_path = "arisan.m4a"  # Change this to your audio file
result = model.transcribe(audio_path)

# Print detected language
print("Detected language:", result["language"])

# Print transcription
print("Transcript:")
print(result["text"])
