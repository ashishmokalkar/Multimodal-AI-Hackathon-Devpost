import { useEffect, useMemo } from "react";
import { targetColor } from "../../lib/colorScale";
import { driverPillText } from "../../lib/summary";
import { useUiStore } from "../../store/uiStore";
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconPause,
  IconPlay,
} from "./icons";
import { BandChip, UnsureChip } from "./parts";
import { useStudioData } from "./studioData";
import { buildTour, percent } from "./studioModel";
import { useStudioStore } from "./studioStore";

const STEP_MS = 6500;

/** Cinematic walk-through: overview, then each artery, with the camera flying to each stop. */
export function TourOverlay() {
  const tour = useStudioStore((state) => state.tour);
  const setStep = useStudioStore((state) => state.setTourStep);
  const setPlaying = useStudioStore((state) => state.setTourPlaying);
  const stopTour = useStudioStore((state) => state.stopTour);
  const { shown, features } = useStudioData();
  const steps = useMemo(
    () => (shown && !shown.mock ? buildTour(shown, features) : []),
    [features, shown],
  );
  const step = steps[tour.step];

  // move the camera and the selection with the tour
  useEffect(() => {
    if (!tour.active || !step) {
      return;
    }
    useUiStore.getState().setSelectedVessel(step.vessel);
    useStudioStore.getState().focus(step.vessel);
  }, [step, tour.active]);

  useEffect(() => {
    if (!tour.active || !tour.playing || !steps.length) {
      return;
    }
    const timer = setTimeout(() => {
      if (tour.step < steps.length - 1) {
        setStep(tour.step + 1);
      } else {
        setPlaying(false);
      }
    }, STEP_MS);
    return () => clearTimeout(timer);
  }, [setPlaying, setStep, steps.length, tour.active, tour.playing, tour.step]);

  useEffect(() => {
    if (!tour.active) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        useUiStore.getState().setSelectedVessel(null);
        stopTour();
      } else if (event.key === "ArrowRight") {
        setStep(Math.min(steps.length - 1, tour.step + 1));
      } else if (event.key === "ArrowLeft") {
        setStep(Math.max(0, tour.step - 1));
      } else if (event.key === " ") {
        event.preventDefault();
        setPlaying(!tour.playing);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPlaying, setStep, steps.length, stopTour, tour.active, tour.playing, tour.step]);

  if (!tour.active) {
    return null;
  }
  if (!step) {
    return (
      <div className="tour" role="dialog" aria-label="Guided tour">
        <p>The tour needs a real-model prediction.</p>
        <button className="btn-ghost" onClick={stopTour} type="button">
          Close
        </button>
      </div>
    );
  }

  const color = step.target === "cad" ? "var(--s-flag)" : targetColor(step.target);
  const exit = () => {
    useUiStore.getState().setSelectedVessel(null);
    stopTour();
  };

  return (
    <div className="tour" role="dialog" aria-label="Guided tour" aria-live="polite">
      <div className="tour-progress" aria-hidden="true">
        {steps.map((item, index) => (
          <button
            className={index < tour.step ? "done" : index === tour.step ? "now" : ""}
            key={item.target}
            onClick={() => setStep(index)}
            tabIndex={-1}
            type="button"
          >
            <i
              key={`${tour.step}-${tour.playing}`}
              style={
                index === tour.step && tour.playing
                  ? { animationDuration: `${STEP_MS}ms` }
                  : undefined
              }
            />
          </button>
        ))}
      </div>
      <div className="tour-main">
        <div className="tour-number" style={{ color }}>
          {percent(step.probability)}
          <small>%</small>
        </div>
        <div className="tour-text">
          <h3>
            <span style={{ color }}>{step.title}</span>
            <BandChip band={step.band} small />
            {step.uncertain && <UnsureChip />}
          </h3>
          <p>{step.subtitle}</p>
          <div className="tour-pills">
            {step.raising.map((driver) => (
              <span className="tpill sl-raise" key={driver.feature}>
                ▲ {driverPillText(driver)}
              </span>
            ))}
            {step.lowering.map((driver) => (
              <span className="tpill sl-lower" key={driver.feature}>
                ▼ {driverPillText(driver)}
              </span>
            ))}
          </div>
        </div>
      </div>
      <div className="tour-controls">
        <button
          aria-label="Previous stop"
          disabled={tour.step === 0}
          onClick={() => setStep(tour.step - 1)}
          type="button"
        >
          <IconChevronLeft />
        </button>
        <button
          aria-label={tour.playing ? "Pause tour" : "Play tour"}
          onClick={() => setPlaying(!tour.playing)}
          type="button"
        >
          {tour.playing ? <IconPause /> : <IconPlay />}
        </button>
        <button
          aria-label="Next stop"
          disabled={tour.step === steps.length - 1}
          onClick={() => setStep(tour.step + 1)}
          type="button"
        >
          <IconChevronRight />
        </button>
        <button aria-label="End tour" onClick={exit} type="button">
          <IconClose />
        </button>
      </div>
    </div>
  );
}
