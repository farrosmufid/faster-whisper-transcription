// Add new state for source language text
const [sourceLanguageText, setSourceLanguageText] = useState<Array<ServerTextData>>([]);


// Add this ref for source language text
const lastSourceLanguageResultRef = useRef<HTMLDivElement | null>(null);

// Modify the translation event handler
useEffect(() => {
  if (socket != null) {
    const onTranslationText = (data: ServerTextData) => {
      setReceivedData((prev) => [...prev, data]);
      
      // 🖥️ HANDLE SOURCE LANGUAGE DISPLAY
      if (data.source_language) {
        setSourceLanguageText((prev) => [...prev, data]);
      }
      
      debug()?.receivedText(data.payload);
    };

    const onTranslationSpeech = (data: ServerSpeechData) => {
      bufferedSpeechPlayer.addAudioToBuffer(data.payload, data.sample_rate);
    };

    socket.on('translation_text', onTranslationText);
    socket.on('translation_speech', onTranslationSpeech);

    return () => {
      socket.off('translation_text', onTranslationText);
      socket.off('translation_speech', onTranslationSpeech);
    };
  }
}, [bufferedSpeechPlayer, socket]);

// Create source language sentences
const sourceLanguageSentences = getTranslationSentencesFromReceivedData(sourceLanguageText);
const sourceLanguageSentencesWithEmptyStartingString = 
  streamingStatus === 'running' && sourceLanguageSentences.length === 0
    ? ['']
    : sourceLanguageSentences;

    // Replace the second Stack (lines 1045-1080) with this:
<Stack direction="row">
  <div className="translation-text-sra">
    <Typography variant="h6" sx={{ color: '#666', marginBottom: 1 }}>
      🔍 Source Language (Detected by Whisper)
    </Typography>
    {sourceLanguageSentencesWithEmptyStartingString.map(
      (sentence, index, arr) => {
        const isLast = index === arr.length - 1;
        const maybeRef = isLast
          ? {ref: lastSourceLanguageResultRef}
          : {};
        return (
          <div className="text-chunk-sra" key={`source-${index}`} {...maybeRef}>
            <Typography variant="body1" sx={{ fontStyle: 'italic', color: '#666' }}>
              {sentence} {/* 🖥️ DISPLAY SOURCE LANGUAGE TEXT */}
              {animateTextDisplay && isLast && (
                <Blink
                  intervalMs={CURSOR_BLINK_INTERVAL_MS}
                  shouldBlink={(roomState?.activeTranscoders ?? 0) > 0}>
                  <Typography
                    component="span"
                    variant="body1"
                    sx={{
                      display: 'inline-block',
                      transform: 'scaleY(1.25) translateY(-1px)',
                    }}>
                    {'|'}
                  </Typography>
                </Blink>
              )}
            </Typography>
          </div>
        );
      },
    )}
  </div>
</Stack>