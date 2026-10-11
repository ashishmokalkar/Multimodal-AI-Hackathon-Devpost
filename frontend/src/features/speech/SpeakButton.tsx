import { useEffect } from "react";
import { createPortal } from "react-dom";
import { speechSupported, useSpeechStore } from "./speechStore";

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
}: {
  /** Built on click, so the text always matches the result on screen. */
  sentences: () => string[];
  /** Identity of the result; a new result stops the old reading. */
  resultKey: string | null;
  className?: string;
  label?: string;
  captions?: boolean;
}) {
  const index = useSpeechStore((state) => state.index);
  const spoken = useSpeechStore((state) => state.sentences);
  const speaking = index >= 0;

  useEffect(() => () => useSpeechStore.getState().stop(), [resultKey]);

  if (!speechSupported()) {
    return null;
  }
  return (
    <span className={`speak ${className}`}>
      <button
        aria-pressed={speaking}
        className="speak-btn"
        disabled={!resultKey}
        onClick={() => {
          const store = useSpeechStore.getState();
          if (speaking) {
            store.stop();
          } else {
            store.speak(sentences());
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
          <span aria-hidden="true" className="speak-caption">
            {spoken[index]}
          </span>,
          document.body,
        )}
    </span>
  );
}
