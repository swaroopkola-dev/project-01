import { useEffect, useRef, useState } from "react";
import { classifyGesture } from "./gesture";
import { getInteractiveTarget } from "./targets";

export function HandControl({ cursorRef, onStatusChange }) {
  const videoRef = useRef(null);
  const detectorRef = useRef(null);
  const streamRef = useRef(null);
  const frameRef = useRef(null);
  const sessionRef = useRef(0);
  const activeRef = useRef(false);
  const busyRef = useRef(false);
  const lastVideoTimeRef = useRef(-1);
  const gestureStateRef = useRef({ candidate: "neutral", count: 0, current: "neutral" });
  const clickRef = useRef({ active: false, target: null });
  const scrollRef = useRef({ direction: 0, state: "idle", changedAt: 0 });
  const scrollFrameRef = useRef(null);
  const hoverRef = useRef(null);
  const smoothRef = useRef({ x: 0.5, y: 0.5 });
  const lastStatusRef = useRef("");

  const [enabled, setEnabled] = useState(false);
  const [cameraVisible, setCameraVisible] = useState(false);
  const [status, setStatus] = useState("off");
  const [error, setError] = useState("");

  const emitStatus = (value) => {
    if (lastStatusRef.current === value) return;
    lastStatusRef.current = value;
    setStatus(value);
    onStatusChange?.(value);
  };

  const setCursorVisible = (visible) => {
    if (cursorRef?.current) cursorRef.current.dataset.visible = String(visible);
  };

  const setCursor = (x, y, mode) => {
    const node = cursorRef?.current;
    if (!node) return;
    node.style.transform = "translate3d(" + x + "px," + y + "px,0)";
    node.style.setProperty("--hand-cursor-scale", mode === "click-hold" ? "1.16" : mode.startsWith("scroll") ? "1.22" : "1");
    node.style.setProperty("--hand-cursor-color", mode === "click-hold" ? "var(--acid)" : mode.startsWith("scroll") ? "var(--cyan)" : mode === "pause" ? "#9ba3b2" : "#f6ffcf");
    setCursorVisible(true);
  };

  const clearHover = () => {
    hoverRef.current?.classList.remove("is-hand-hover");
    hoverRef.current = null;
  };

  const cancelClick = () => {
    clickRef.current = { active: false, target: null };
    document.documentElement.style.setProperty("--hand-cursor-pulse", "0");
  };

  const completeClick = () => {
    const held = clickRef.current;
    if (!held.active) return;
    clickRef.current = { active: false, target: null };
    document.documentElement.style.setProperty("--hand-cursor-pulse", "0");
    if (held.target && document.contains(held.target)) {
      if (held.target instanceof HTMLAnchorElement && held.target.target === "_blank") {
        window.location.assign(held.target.href);
      } else {
        held.target.click();
      }
    }
  };

  const stabilizeGesture = (next, now) => {
    const state = gestureStateRef.current;
    state.count = next === state.candidate ? state.count + 1 : 1;
    state.candidate = next;
    const required = next === "pointer" || next === "click-hold" ? 2 : 3;
    if (state.count >= required) {
      state.current = next;
      state.currentAt = now;
    }
    return state.current;
  };

  useEffect(() => {
    activeRef.current = enabled;
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return undefined;

    let previousTime = performance.now();

    const runScroll = (now) => {
      if (!activeRef.current) return;
      const state = scrollRef.current;
      const dt = Math.min(34, Math.max(0, now - previousTime));
      previousTime = now;

      const viewportHeight = window.innerHeight || 800;
      const maxSpeed = Math.max(720, Math.min(viewportHeight * 1.2, 1150));
      const minSpeed = Math.min(300, maxSpeed * 0.34);
      const accelerationMs = 220;
      const decelerationMs = 180;

      if (state.state === "active" && state.direction) {
        const elapsed = Math.max(0, now - state.changedAt);
        const ramp = Math.min(1, elapsed / accelerationMs);
        const speed = minSpeed + (maxSpeed - minSpeed) * ramp;
        window.scrollBy(0, state.direction * speed * dt / 1000);
      } else if (state.state === "stopping" && state.direction) {
        const elapsed = Math.max(0, now - state.changedAt);
        const progress = Math.min(1, elapsed / decelerationMs);
        if (progress >= 1) {
          state.direction = 0;
          state.state = "idle";
        } else {
          const remaining = (1 - progress) ** 2;
          window.scrollBy(0, state.direction * maxSpeed * remaining * dt / 1000);
        }
      }

      scrollFrameRef.current = requestAnimationFrame(runScroll);
    };

    scrollFrameRef.current = requestAnimationFrame(runScroll);

    return () => {
      if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
      scrollFrameRef.current = null;
    };
  }, [enabled]);

  // The cleanup helpers are component-local DOM utilities; keep this effect one-shot.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => () => {
    activeRef.current = false;
    sessionRef.current += 1;
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    if (scrollFrameRef.current) cancelAnimationFrame(scrollFrameRef.current);
    streamRef.current?.getTracks().forEach((track) => track.stop());
    detectorRef.current?.close?.();
    cancelClick();
    clearHover();
    setCursorVisible(false);
  }, []);

  const detectFrame = () => {
    const video = videoRef.current;
    const detector = detectorRef.current;
    if (!activeRef.current || !video || !detector || video.readyState < 2) {
      if (activeRef.current) frameRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    if (video.currentTime === lastVideoTimeRef.current) {
      frameRef.current = requestAnimationFrame(detectFrame);
      return;
    }
    lastVideoTimeRef.current = video.currentTime;

    const result = detector.detectForVideo(video, performance.now());
    const hand = result?.landmarks?.[0];

    if (!hand) {
      cancelClick();
      clearHover();
      const now = performance.now();
      if (scrollRef.current.direction) {
        scrollRef.current.state = "stopping";
        scrollRef.current.changedAt = now;
      } else {
        scrollRef.current = { direction: 0, state: "idle", changedAt: now };
      }
      setCursorVisible(false);
      emitStatus("FIND YOUR HAND");
      frameRef.current = requestAnimationFrame(detectFrame);
      return;
    }

    const now = performance.now();
    const raw = classifyGesture(hand, gestureStateRef.current.current);
    const gestureType = stabilizeGesture(raw.type, now);

    const tip = hand[8];
    const targetX = 1 - tip.x;
    const targetY = tip.y;
    // Edge-assist: the final 10% of the camera range expands toward the
    // corresponding viewport edge, making corners easier to reach without
    // changing the center-area tracking feel.
    const EDGE_START = 0.90;
    const expandEdge = (value) => {
      if (value <= 0.1) return value * 0.65;
      if (value >= EDGE_START) return 1 - (1 - value) * 0.25;
      return value;
    };

    const assistedX = expandEdge(targetX);
    const assistedY = expandEdge(targetY);
    const assistedDx = assistedX - smoothRef.current.x;
    const assistedDy = assistedY - smoothRef.current.y;
    const smoothing = Math.min(
      0.82,
      0.46 + Math.hypot(assistedDx, assistedDy) * 2.4
    );

    smoothRef.current.x += assistedDx * smoothing;
    smoothRef.current.y += assistedDy * smoothing;

    // Hard clamp to the viewport so the pointer never gets stranded short
    // of a boundary because of smoothing.
    const x = Math.max(0, Math.min(window.innerWidth - 1, smoothRef.current.x * window.innerWidth));
    const y = Math.max(0, Math.min(window.innerHeight - 1, smoothRef.current.y * window.innerHeight));
    setCursor(x, y, gestureType);

    if (gestureType === "pointer" || gestureType === "click-hold") {
      if (scrollRef.current.direction) {
        scrollRef.current.state = "stopping";
        scrollRef.current.changedAt = now;
      }

      const target = getInteractiveTarget(x, y);
      if (target !== hoverRef.current) {
        clearHover();
        hoverRef.current = target;
        target?.classList.add("is-hand-hover");
      }

      if (gestureType === "click-hold") {
        if (!clickRef.current.active) {
          clickRef.current = { active: true, target };
          target?.focus?.({ preventScroll: true });
          document.documentElement.style.setProperty("--hand-cursor-pulse", "1");
        } else if (clickRef.current.target !== target) {
          cancelClick();
          clickRef.current = { active: true, target };
        }
        emitStatus(target ? "CLICKING" : "CLICK READY");
      } else {
        if (clickRef.current.active) completeClick();
        emitStatus(target ? "POINTER READY" : "POINTER");
      }
    } else if (gestureType === "scroll-up" || gestureType === "scroll-down") {
      cancelClick();
      clearHover();

      const direction = gestureType === "scroll-up" ? -1 : 1;
      const state = scrollRef.current;

      if (state.direction !== direction) {
        state.direction = direction;
        state.state = "active";
        state.changedAt = now;
      } else if (state.state !== "active") {
        state.state = "active";
        state.changedAt = now;
      }

      emitStatus(gestureType === "scroll-up" ? "SCROLL UP" : "SCROLL DOWN");
    } else if (gestureType === "pause") {
      cancelClick();
      clearHover();

      if (scrollRef.current.direction) {
        scrollRef.current.state = "stopping";
        scrollRef.current.changedAt = now;
      }

      emitStatus("PAUSED");
    } else {
      cancelClick();
      clearHover();

      if (scrollRef.current.direction) {
        scrollRef.current.state = "stopping";
        scrollRef.current.changedAt = now;
      }

      emitStatus("TRACKING");
    }

    frameRef.current = requestAnimationFrame(detectFrame);
  };

  const start = async () => {
    if (busyRef.current || enabled) return;
    busyRef.current = true;
    const session = ++sessionRef.current;
    setError("");
    emitStatus("STARTING");

    try {
      if (!navigator.mediaDevices?.getUserMedia) throw new Error("INSECURE_CONTEXT");
      const mediapipe = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/+esm");
      if (session !== sessionRef.current) return;

      const fileset = await mediapipe.FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm");
      if (session !== sessionRef.current) return;

      const detector = await mediapipe.HandLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
        },
        runningMode: "VIDEO",
        numHands: 1,
        minHandDetectionConfidence: 0.58,
        minHandPresenceConfidence: 0.58,
        minTrackingConfidence: 0.58,
      });
      if (session !== sessionRef.current) {
        detector.close?.();
        return;
      }
      detectorRef.current = detector;

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user", frameRate: { ideal: 30, max: 60 } },
        audio: false,
      });
      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        detector.close?.();
        return;
      }

      streamRef.current = stream;
      videoRef.current.srcObject = stream;
      videoRef.current.muted = true;
      videoRef.current.playsInline = true;
      await videoRef.current.play();

      if (session !== sessionRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        detector.close?.();
        return;
      }

      activeRef.current = true;
      setEnabled(true);
      lastVideoTimeRef.current = -1;
      gestureStateRef.current = { candidate: "neutral", count: 0, current: "neutral" };
      scrollRef.current = { direction: 0, state: "idle", changedAt: performance.now() };
      setCursorVisible(false);
      emitStatus("FIND YOUR HAND");
      frameRef.current = requestAnimationFrame(detectFrame);
    } catch (err) {
      activeRef.current = false;
      setEnabled(false);
      emitStatus("UNAVAILABLE");
      setError(
        err?.name === "NotAllowedError"
          ? "Camera permission was denied."
          : err?.message === "INSECURE_CONTEXT"
            ? "Camera access requires HTTPS or localhost."
            : "Hand tracking could not start. Check the camera and network connection."
      );
      detectorRef.current?.close?.();
      detectorRef.current = null;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCursorVisible(false);
    } finally {
      busyRef.current = false;
    }
  };

  const stop = () => {
    activeRef.current = false;
    sessionRef.current += 1;
    setEnabled(false);
    if (frameRef.current) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current?.close?.();
    detectorRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    cancelClick();
    clearHover();
    scrollRef.current = { direction: 0, state: "idle", changedAt: performance.now() };
    setCursorVisible(false);
    emitStatus("OFF");
  };

  return (
    <section id="air-control" className={"hand-control " + (enabled ? "is-active" : "")}>
      <video ref={videoRef} className={"hand-control__video " + (cameraVisible ? "is-visible" : "")} playsInline muted aria-label="Camera preview for hand control" />
      <div className="hand-control__header">
        <div>
          <p className="section-label">05 — Air control</p>
          <h2>Hands become the interface.</h2>
          <p className="hand-control__copy">☝ Point · 👍 thumb-open click · 🤟 3-finger up · 🖐 4-finger down · ✋ pause</p>
        </div>
        <div className="hand-control__actions">
          <button className={"button " + (enabled ? "button--light" : "button--primary")} type="button" onClick={enabled ? stop : start}>
            {enabled ? "Turn off" : "Enable camera"}
          </button>
          {enabled && (
            <label className="camera-toggle">
              <input type="checkbox" checked={cameraVisible} onChange={(event) => setCameraVisible(event.target.checked)} />
              <span>Show camera</span>
            </label>
          )}
        </div>
      </div>
      <div className="hand-control__statusbar">
        <span className={"hand-control__status hand-control__status--" + status.toLowerCase().replaceAll(" ", "-")}><i /> {status || "OFF"}</span>
        <span className="hand-control__hint">Index controls the cursor. Open thumb holds click; close thumb completes it. Three fingers scroll up, four scroll down.</span>
      </div>
      <div className="hand-control__gestures">
        <span>☝ Pointer</span>
        <span>👍 Thumb open = click hold</span>
        <span>🤟 3 fingers = up</span>
        <span>🖐 4 fingers = down</span>
        <span>✋ Open / fist = pause</span>
      </div>
      {error && <p className="hand-control__error" role="alert">{error}</p>}
    </section>
  );
}


