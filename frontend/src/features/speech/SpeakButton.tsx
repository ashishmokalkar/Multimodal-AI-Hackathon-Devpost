import { useEffect } from "react";
import { createPortal } from "react-dom";
import { clipKey } from "../../lib/spokenSummaryHindi";
import { HINDI_CLIPS } from "./hindiClips";
import { speechSupported, useSpeechStore } from "./speechStore";

/** Hindi is recorded (Sarvam AI) for the featured patients only; anything else is read in English with a note. */
const HINDI_MISSING = "Hindi is available for the four featured patients, so here is the summary in English.";

/**
 * "Listen" button: reads a short summary of the result aloud and captions the sentence being spoken. Stops when
 * the result changes or the button unmounts.
 */
export function SpeakButton({
  sentences,
  resultKey,
  className = "",
  label = "Listen",
  captions = true,
  hindi,
}: {
  /** Built on click, so the text always matches the result on screen. */
  sentences: () => string[];
  /** The Hindi version, when this button offers the language switch. */
  hindi?: () => string[];
  /** Identity of the result; a new result stops the old reading. */
  resultKey: string | null;
  className?: string;
  label?: string;
  captions?: boolean;
}) {
  const index = useSpeechStore((state) => state.index);
  const spoken = useSpeechStore((state) => state.sentences);
  const language = useSpeechStore((state) => state.language);
  const speaking = index >= 0;
  const inHindi = hindi !== undefined && language === "hi";

  const start = () => {
    const store = useSpeechStore.getState();
    if (inHindi) {
      const lines = hindi();
      const key = clipKey(lines);
      if (HINDI_CLIPS.includes(key)) {
        store.playClip(`/audio/hi/${key}.mp3`, lines);
        return;
      }
      store.speak([HINDI_MISSING, ...sentences()]);
      return;
    }
    store.speak(sentences());
  };

  useEffect(() => () => useSpeechStore.getState().stop(), [resultKey]);

  if (!speechSupported()) {
    return null;
  }
  return (
    <span className={`speak ${className}`}>
      {hindi && (
        <span aria-label="Listen language" className="speak-lang" role="group">
          {(["en", "hi"] as const).map((option) => (
            <button
              aria-pressed={language === option}
              key={option}
              lang={option}
              onClick={() => useSpeechStore.getState().setLanguage(option)}
              title={option === "hi" ? "Listen in Hindi (featured patients)" : "Listen in English"}
              type="button"
            >
              {option === "hi" ? "हिं" : "EN"}
            </button>
          ))}
        </span>
      )}
      <button
        aria-pressed={speaking}
        className="speak-btn"
        disabled={!resultKey}
        onClick={() => {
          if (speaking) {
            useSpeechStore.getState().stop();
          } else {
            start();
          }
        }}
        title={speaking ? "Stop" : "Read a short summary aloud"}
        type="button"
      >
        <span aria-hidden="true" className={`speak-bars${speaking ? " is-on" : ""}`}>
          <i />
          <i />
          <i />
          <i />
        </span>
        <span>{speaking ? "Stop" : label}</span>
        <span className="sr-only">
          {speaking ? " reading aloud" : " to a short spoken summary of the result"}
        </span>
      </button>
      {captions &&
        speaking &&
        // the spoken words, for anyone who cannot hear them (screen readers have the written result already);
        // portalled so a blurred toolbar cannot become its containing block
        createPortal(
          <span aria-hidden="true" className="speak-caption" lang={inHindi ? "hi" : "en"}>
            {spoken[index]}
          </span>,
          document.body,
        )}
    </span>
  );
}
