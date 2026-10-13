import { create } from "zustand";

export type SpeechLanguage = "en" | "hi";

interface SpeechState {
  /** Sentence being spoken, or -1 when silent. */
  index: number;
  sentences: string[];
  language: SpeechLanguage;
  setLanguage: (language: SpeechLanguage) => void;
  speak: (sentences: string[]) => void;
  /** Plays a recorded clip of these sentences, captioning each in turn (timed by its share of the text). */
  playClip: (url: string, sentences: string[]) => void;
  stop: () => void;
}

const LANGUAGE_KEY = "cardioclarity-listen-language";

function storedLanguage(): SpeechLanguage {
  try {
    return window.localStorage.getItem(LANGUAGE_KEY) === "hi" ? "hi" : "en";
  } catch {
    return "en";
  }
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
let audio: HTMLAudioElement | null = null;

/**
 * Reads a summary aloud with the browser's speech engine, one sentence per utterance (long utterances get cut off
 * in some browsers) so the current sentence can be captioned. Nothing is sent anywhere.
 */
export const useSpeechStore = create<SpeechState>((set, get) => ({
  index: -1,
  sentences: [],
  language: storedLanguage(),
  setLanguage: (language) => {
    get().stop();
    try {
      window.localStorage.setItem(LANGUAGE_KEY, language);
    } catch {
      // the choice still applies for this visit
    }
    set({ language });
  },
  playClip: (url, sentences) => {
    get().stop();
    const token = ++run;
    const clip = new Audio(url);
    audio = clip;
    // where each sentence ends, as a share of the whole text
    const total = sentences.reduce((sum, sentence) => sum + sentence.length, 0) || 1;
    let running = 0;
    const ends = sentences.map((sentence) => (running += sentence.length) / total);
    const finish = () => {
      if (token === run) {
        audio = null;
        set({ index: -1 });
      }
    };
    clip.ontimeupdate = () => {
      if (token !== run || !clip.duration) {
        return;
      }
      const at = clip.currentTime / clip.duration;
      const index = Math.max(0, ends.findIndex((end) => at < end));
      if (index !== get().index) {
        set({ index });
      }
    };
    clip.onended = finish;
    clip.onerror = finish;
    set({ sentences, index: 0 });
    void clip.play().catch(finish);
  },
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
    audio?.pause();
    audio = null;
    if (get().index !== -1) {
      set({ index: -1 });
    }
  },
}));
