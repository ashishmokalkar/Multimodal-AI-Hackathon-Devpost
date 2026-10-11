import { create } from "zustand";

interface SpeechState {
  /** Sentence being spoken, or -1 when silent. */
  index: number;
  sentences: string[];
  speak: (sentences: string[]) => void;
  stop: () => void;
}

export function speechSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window &&
    typeof window.SpeechSynthesisUtterance === "function"
  );
}

/** A clear English voice: the system's natural/neural voices first, then any British or American one. */
function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((voice) => voice.lang.startsWith("en"));
  return (
    voices.find((voice) => /natural|neural|online/i.test(voice.name)) ??
    voices.find((voice) => voice.lang === "en-GB") ??
    voices.find((voice) => voice.lang === "en-US") ??
    voices[0] ??
    null
  );
}

/** Each run gets a token so callbacks from a cancelled run are ignored. */
let run = 0;

/**
 * Reads a summary aloud with the browser's speech engine, one sentence per utterance (long utterances get cut off
 * in some browsers) so the current sentence can be captioned. Nothing is sent anywhere.
 */
export const useSpeechStore = create<SpeechState>((set, get) => ({
  index: -1,
  sentences: [],
  speak: (sentences) => {
    if (!speechSupported() || !sentences.length) {
      return;
    }
    const synth = window.speechSynthesis;
    synth.cancel();
    const token = ++run;
    const voice = pickVoice();
    const say = (index: number) => {
      if (token !== run) {
        return;
      }
      if (index >= sentences.length) {
        set({ index: -1 });
        return;
      }
      set({ index });
      const utterance = new SpeechSynthesisUtterance(sentences[index]);
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      }
      utterance.rate = 0.98;
      utterance.onend = () => say(index + 1);
      utterance.onerror = () => {
        if (token === run) {
          set({ index: -1 });
        }
      };
      synth.speak(utterance);
    };
    set({ sentences });
    say(0);
  },
  stop: () => {
    run += 1;
    if (speechSupported()) {
      window.speechSynthesis.cancel();
    }
    if (get().index !== -1) {
      set({ index: -1 });
    }
  },
}));
