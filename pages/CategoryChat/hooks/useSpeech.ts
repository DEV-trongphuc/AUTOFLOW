import { useState, useCallback, useRef, useEffect } from 'react';

export function useSpeech() {
    const [isListening, setIsListening] = useState(false);
    const [realtimeTranscript, setRealtimeTranscript] = useState('');
    const [isSpeaking, setIsSpeaking] = useState(false);

    const recognitionRef = useRef<any>(null);
    const synthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Use a ref for stopListening so recognition callbacks always call the latest version
    const stopListeningRef = useRef<() => void>(() => {});

    useEffect(() => {
        const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
        if (SpeechRecognition) {
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = true;
            recognitionRef.current.interimResults = true;
            recognitionRef.current.lang = 'vi-VN';
        }

        return () => {
            if (recognitionRef.current) {
                try { recognitionRef.current.stop(); } catch { /* ignore if already stopped */ }
            }
            // Guard: speechSynthesis may not be available in all environments
            if (typeof window !== 'undefined' && window.speechSynthesis) {
                window.speechSynthesis.cancel();
            }
        };
    }, [])

    const speakMessage = useCallback((text: string) => {
        if (!window.speechSynthesis) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'vi-VN';
        utterance.rate = 1.1;
        utterance.pitch = 1.0;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        synthesisRef.current = utterance;
        window.speechSynthesis.speak(utterance);
    }, []);

    const stopSpeaking = useCallback(() => {
        if (window.speechSynthesis) window.speechSynthesis.cancel();
        setIsSpeaking(false);
    }, []);

    const startListening = useCallback((onResult: (text: string) => void) => {
        if (!recognitionRef.current) return;

        setRealtimeTranscript('');
        setIsListening(true);

        recognitionRef.current.onresult = (event: any) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            setRealtimeTranscript(finalTranscript || interimTranscript);
            if (finalTranscript) {
                onResult(finalTranscript);
                // Use ref to avoid stale closure on stopListening
                stopListeningRef.current();
            }
        };

        recognitionRef.current.onerror = (event: any) => {
            console.error('Speech recognition error:', event.error);
            stopListeningRef.current();
        };

        recognitionRef.current.onend = () => {
            setIsListening(false);
        };

        recognitionRef.current.start();
    }, []);

    const stopListening = useCallback(() => {
        if (recognitionRef.current) {
            recognitionRef.current.stop();
        }
        setIsListening(false);
    }, []);

    // Keep stopListeningRef in sync so recognition callbacks always call the latest version
    useEffect(() => {
        stopListeningRef.current = stopListening;
    }, [stopListening]);

    return {
        isListening,
        realtimeTranscript,
        isSpeaking,
        speakMessage,
        stopSpeaking,
        startListening,
        stopListening
    };
}
