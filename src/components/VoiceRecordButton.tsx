import { useState, useRef, useCallback } from "react";
import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface VoiceRecordButtonProps {
  onTranscript: (text: string) => void;
}

const VoiceRecordButton = ({ onTranscript }: VoiceRecordButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef<any>(null);

  const toggleRecording = useCallback(() => {
    // Stop
    if (isRecording) {
      recognitionRef.current?.stop();
      setIsRecording(false);
      return;
    }

    // Start
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Speech recognition is not supported in this browser.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = false;
    recognition.lang = "en-US";

    // Helpful diagnostics
    recognition.onstart = () => console.log("Speech recognition started");
    recognition.onaudiostart = () => console.log("Audio capturing started");
    recognition.onspeechstart = () => console.log("Speech started");
    recognition.onspeechend = () => console.log("Speech ended");

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        }
      }

      if (transcript) {
        // Optional but useful while testing
        toast.success("Captured speech");
        onTranscript(transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error, event);

      switch (event.error) {
        case "not-allowed":
        case "service-not-allowed":
          toast.error("Microphone access denied. Please allow microphone permissions.");
          break;
        case "network":
          toast.error(
            "Speech-to-text failed due to a network error. Try disabling ad blockers/VPN, using a different network, or Chrome Incognito."
          );
          break;
        case "no-speech":
          toast.error("No speech detected. Try again and speak closer to the microphone.");
          break;
        case "audio-capture":
          toast.error("No microphone was found (or it’s in use by another app).");
          break;
        default:
          toast.error(`Speech recognition error: ${event.error}`);
      }

      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [isRecording, onTranscript]);

  return (
    <Button
      type="button"
      variant={isRecording ? "destructive" : "outline"}
      size="sm"
      onClick={toggleRecording}
      className="gap-1.5"
    >
      {isRecording ? (
        <>
          <MicOff className="h-4 w-4" />
          Stop Recording
        </>
      ) : (
        <>
          <Mic className="h-4 w-4" />
          Voice Input
        </>
      )}
    </Button>
  );
};

export default VoiceRecordButton;
