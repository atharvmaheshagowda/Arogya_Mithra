import { useState, useEffect, useRef, useCallback } from "react";

export interface SpeechRecognitionOptions {
  language?: string; // e.g., 'en-IN', 'en-US', 'kn-IN', 'hi-IN'
  onFinalTranscript?: (text: string) => void;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  isListening: boolean;
  interimTranscript: string;
  finalTranscript: string;
  errorMessage: string | null;
  startListening: () => void;
  stopListening: () => void;
  resetTranscript: () => void;
  setFinalTranscriptText: (text: string) => void;
  clearError: () => void;
}

// Browser Web Speech API type definitions for TypeScript compatibility
interface IWindowWithSpeech extends Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
}

export function useSpeechRecognition({
  language = "en-IN",
  onFinalTranscript,
}: SpeechRecognitionOptions = {}): UseSpeechRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");
  const [finalTranscript, setFinalTranscript] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const isListeningRef = useRef(false);
  const shouldRestartRef = useRef(false);

  // Check browser support
  const isSupported = typeof window !== "undefined" &&
    Boolean(
      (window as IWindowWithSpeech).SpeechRecognition ||
      (window as IWindowWithSpeech).webkitSpeechRecognition
    );

  const stopListening = useCallback(() => {
    shouldRestartRef.current = false;
    isListeningRef.current = false;
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // Ignore stop errors if already inactive
      }
    }
    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const resetTranscript = useCallback(() => {
    setFinalTranscript("");
    setInterimTranscript("");
    setErrorMessage(null);
  }, []);

  const clearError = useCallback(() => {
    setErrorMessage(null);
  }, []);

  const setFinalTranscriptText = useCallback((text: string) => {
    setFinalTranscript(text);
  }, []);

  const startListening = useCallback(() => {
    setErrorMessage(null);
    setInterimTranscript("");

    if (!isSupported) {
      setErrorMessage(
        "Web Speech Recognition is not supported in this browser. Please use Chrome, Edge, or switch to Manual Text Input."
      );
      return;
    }

    // Stop existing instance if running
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch (e) {
        // ignore
      }
    }

    try {
      const SpeechRecognitionConstructor =
        (window as IWindowWithSpeech).SpeechRecognition ||
        (window as IWindowWithSpeech).webkitSpeechRecognition;

      const recognition = new SpeechRecognitionConstructor();
      recognitionRef.current = recognition;

      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        isListeningRef.current = true;
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let newFinalPart = "";

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const result = event.results[i];
          const transcriptChunk = result[0]?.transcript || "";

          if (result.isFinal) {
            newFinalPart += (newFinalPart ? " " : "") + transcriptChunk.trim();
          } else {
            interim += (interim ? " " : "") + transcriptChunk;
          }
        }

        if (newFinalPart) {
          setFinalTranscript((prev) => {
            const separator = prev && !prev.endsWith("\n") && !prev.endsWith(" ") ? " " : "";
            const updated = prev ? `${prev}${separator}${newFinalPart}` : newFinalPart;
            if (onFinalTranscript) {
              onFinalTranscript(updated);
            }
            return updated;
          });
        }

        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        const error = event.error;
        let humanMessage = `Microphone error: ${error}`;

        if (error === "not-allowed" || error === "service-not-allowed") {
          humanMessage =
            "Microphone access was denied. Please allow microphone permissions in your browser address bar and reload.";
        } else if (error === "no-speech") {
          humanMessage = "No speech detected. Please speak clearly into your microphone.";
        } else if (error === "network") {
          humanMessage =
            "Speech recognition network error. Please verify your internet connection. (Browser speech services may rely on remote recognition).";
        } else if (error === "audio-capture") {
          humanMessage =
            "No microphone detected or microphone is busy. Please verify audio input devices.";
        } else if (error === "aborted") {
          // User or code intentionally aborted; don't flash as an error unless unexpected
          if (!shouldRestartRef.current) {
            setIsListening(false);
            return;
          }
        }

        setErrorMessage(humanMessage);
        setIsListening(false);
        isListeningRef.current = false;
      };

      recognition.onend = () => {
        setIsListening(false);
        isListeningRef.current = false;
        setInterimTranscript("");
      };

      recognition.start();
      shouldRestartRef.current = true;
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Failed to initialize microphone speech recognition."
      );
      setIsListening(false);
      isListeningRef.current = false;
    }
  }, [isSupported, language, onFinalTranscript]);

  // Clean up recognition session when component unmounts
  useEffect(() => {
    return () => {
      shouldRestartRef.current = false;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch (e) {
          // ignore
        }
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimTranscript,
    finalTranscript,
    errorMessage,
    startListening,
    stopListening,
    resetTranscript,
    setFinalTranscriptText,
    clearError,
  };
}

