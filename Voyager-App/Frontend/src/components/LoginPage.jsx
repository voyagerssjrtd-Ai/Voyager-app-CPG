// src/components/LoginPage.jsx
import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useAnimation } from "framer-motion";
import { User, Lock, Eye, EyeOff } from "lucide-react";

/**
 * Advanced Cartoon LoginPage — v2 tweaks
 * - Per-blob randomized blinking (full close)
 * - Bigger pupil travel distance (configurable)
 * - Stronger eyebrow frown intensity (configurable)
 * - Faster + smoother mouth morph speed (configurable)
 * - Added minion-style yellow blobs + refined character visuals
 *
 * Paste to: src/components/LoginPage.jsx (overwrite)
 * Dependencies: framer-motion, lucide-react
 */

export default function LoginPage() {
  // POINTER / SPRINGS
  const leftColRef = useRef(null);
  const cardRef = useRef(null);
  const pointer = useRef({ x: 0, y: 0 });
  const rAF = useRef(null);

  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const smx = useSpring(mx, { stiffness: 140, damping: 22 });
  const smy = useSpring(my, { stiffness: 140, damping: 22 });

  // FORM STATE
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [cardRect, setCardRect] = useState(null);

  // INTERACTIONS
  const [pulseLeft, setPulseLeft] = useState(false);
  const [pulseRight, setPulseRight] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [shakeCard, setShakeCard] = useState(false);
  const [flashRed, setFlashRed] = useState(false);
  const [toyPeek, setToyPeek] = useState(false);
  const [toyAngle, setToyAngle] = useState(0);

  // CONFIGURABLE TWEAKS
  const PUPIL_MAX = 18; // bigger pupil travel distance (user-requested)
  const BLINK_MIN = 900; // ms minimum between blinks
  const BLINK_MAX = 3200; // ms maximum between blinks
  const EYEBROW_FROWN_ROT = 12; // degrees rotation when frowning (stronger)
  const MOUTH_MORPH_SPEED = 0.22; // seconds (lower = faster/more snappy)
  const BREATH_DURATION = 3.6; // seconds for idle breathing loop

  // BLOBS CONFIG (includes some 'minion' yellow characters)
  const blobsConfig = [
    // refined blue blob (friendly)
    {
      id: "b-blue",
      relX: 0.18,
      relY: 0.4,
      size: 300,
      colors: ["#3B82F6", "#60A5FA"],
      stroke: "#0b1220",
      wobble: 12,
      attractive: true,
    },
    // refined pink blob
    {
      id: "b-pink",
      relX: 0.05,
      relY: 0.18,
      size: 220,
      colors: ["#FB7185", "#F472B6"],
      stroke: "#44131b",
      wobble: 10,
      attractive: true,
    },
    // minion-style yellow blob with goggles
    {
      id: "b-minion",
      relX: 0.32,
      relY: 0.14,
      size: 200,
      colors: ["#FDE047", "#FACC15"],
      stroke: "#332c1e",
      wobble: 9,
      minion: true,
      attractive: true,
    },
    // small accent blob
    {
      id: "b-small",
      relX: 0.38,
      relY: 0.05,
      size: 140,
      colors: ["#F59E0B", "#FDE68A"],
      stroke: "#7a4a00",
      wobble: 6,
      attractive: true,
    },
  ];

  // PER-BLOB RUNTIME STATE
  const [blinkState, setBlinkState] = useState(
    () =>
      Object.fromEntries(
        blobsConfig.map((b) => [
          b.id,
          {
            closed: false, // fully closed when true
            pending: false,
          },
        ])
      )
  );

  const [eyebrowState, setEyebrowState] = useState(
    () =>
      Object.fromEntries(
        blobsConfig.map((b) => [
          b.id,
          {
            frown: false, // eyebrow frown flag
            twitch: 0,
          },
        ])
      )
  );

  const [mouthState, setMouthState] = useState(
    () => Object.fromEntries(blobsConfig.map((b) => [b.id, "neutral"]))
  );

  // Per-blob animation controls (breathing)
  const animControls = useRef(
    Object.fromEntries(blobsConfig.map((b) => [b.id, useAnimation()]))
  ).current;

  // measure card for toy anchor
  useLayoutEffect(() => {
    function measure() {
      if (cardRef.current) {
        const r = cardRef.current.getBoundingClientRect();
        setCardRect({
          left: r.left,
          top: r.top,
          width: r.width,
          height: r.height,
          centerX: r.left + r.width / 2,
          centerY: r.top + r.height / 2,
        });
      }
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // POINTER TRACKING in left column
  useEffect(() => {
    function handleMove(e) {
      const rect = leftColRef.current?.getBoundingClientRect();
      if (!rect) return;
      pointer.current.x = (e.clientX - rect.left) / rect.width - 0.5;
      pointer.current.y = (e.clientY - rect.top) / rect.height - 0.5;
    }
    function tick() {
      const curX = mx.get();
      const curY = my.get();
      const tx = pointer.current.x;
      const ty = pointer.current.y;
      const lerp = 0.12;
      mx.set(curX + (tx - curX) * lerp);
      my.set(curY + (ty - curY) * lerp);
      rAF.current = requestAnimationFrame(tick);
    }

    const node = leftColRef.current;
    node && node.addEventListener("pointermove", handleMove);
    rAF.current = requestAnimationFrame(tick);

    return () => {
      node && node.removeEventListener("pointermove", handleMove);
      if (rAF.current) cancelAnimationFrame(rAF.current);
    };
  }, [mx, my]);

  // toy angle derived from motion springs (toy rotation)
  useEffect(() => {
    const unsubX = smx.onChange((v) => {
      const x = v;
      const y = smy.get();
      setToyAngle(Math.atan2(y, x) * (180 / Math.PI));
    });
    const unsubY = smy.onChange((v) => {
      const x = smx.get();
      const y = v;
      setToyAngle(Math.atan2(y, x) * (180 / Math.PI));
    });
    return () => {
      unsubX();
      unsubY();
    };
  }, [smx, smy]);

  // Setup per-blob randomized blink timers + breathing loops
  useEffect(() => {
    const timers = {};
    blobsConfig.forEach((b) => {
      // schedule blink loop
      function scheduleBlink() {
        const next = BLINK_MIN + Math.random() * (BLINK_MAX - BLINK_MIN);
        timers[b.id] = setTimeout(() => {
          // close eyelid fully
          setBlinkState((s) => ({ ...s, [b.id]: { ...s[b.id], closed: true } }));
          // short closed duration for full blink
          const closedFor = 90 + Math.random() * 160;
          setTimeout(() => {
            setBlinkState((s) => ({ ...s, [b.id]: { ...s[b.id], closed: false } }));
            scheduleBlink();
          }, closedFor);
        }, next);
      }
      scheduleBlink();

      // breathing animation loop
      (async function breathingLoop() {
        const ctrl = animControls[b.id];
        if (!ctrl) return;
        while (true) {
          try {
            await ctrl.start({
              scale: [1, 1.02, 1],
              transition: { duration: BREATH_DURATION, ease: "easeInOut" },
            });
          } catch {
            break;
          }
        }
      })();
    });

    return () => {
      blobsConfig.forEach((b) => {
        clearTimeout(timers[b.id]);
        const ctrl = animControls[b.id];
        ctrl && ctrl.stop();
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // helper: compute base pixel center for each blob relative to left column
  function computeBase(b) {
    const rect = leftColRef.current?.getBoundingClientRect();
    const w = rect?.width ?? 900;
    const h = rect?.height ?? 900;
    const centerX = (rect?.left ?? 0) + w * b.relX;
    const centerY = (rect?.top ?? 0) + h * b.relY;
    return { baseX: centerX, baseY: centerY, width: w, height: h, left: rect?.left ?? 0, top: rect?.top ?? 0 };
  }

  // clamp utility
  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  // pulses reset
  useEffect(() => {
    if (pulseLeft) {
      const t = setTimeout(() => setPulseLeft(false), 300);
      return () => clearTimeout(t);
    }
  }, [pulseLeft]);

  useEffect(() => {
    if (pulseRight) {
      const t = setTimeout(() => setPulseRight(false), 300);
      return () => clearTimeout(t);
    }
  }, [pulseRight]);

  useEffect(() => {
    if (flashRed) {
      const t = setTimeout(() => setFlashRed(false), 900);
      return () => clearTimeout(t);
    }
  }, [flashRed]);

  useEffect(() => {
    if (shakeCard) {
      const t = setTimeout(() => setShakeCard(false), 700);
      return () => clearTimeout(t);
    }
  }, [shakeCard]);

  // user interactions
  function handleKeyInput(field) {
    if (field === "email") setPulseLeft(true);
    if (field === "password") setPulseRight(true);
  }

  function togglePassword() {
    setPasswordVisible((v) => !v);
    if (!passwordVisible) {
      setToyPeek(true);
      setTimeout(() => setToyPeek(false), 900);
    }
  }

  // mouth path generator for morphing (consistent command pattern so framer interpolates)
  function mouthPathFor(state = "neutral") {
    if (state === "smile") return "M60 120 Q100 160 140 120";
    if (state === "sad") return "M60 140 Q100 100 140 140";
    if (state === "surprised") return "M88 122 Q100 146 112 122";
    return "M70 128 Q100 136 130 128";
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      if (!email || email.indexOf("@") === -1 || !password || password.length < 4) {
        setError("Please enter a valid email and a password at least 4 characters long.");
      } else if (password !== "letmein") {
        setError("Incorrect email or password.");
        setFlashRed(true);
        setShakeCard(true);
        // eyebrow frown + mouth sad for each blob (stronger frown)
        setEyebrowState((s) => {
          const out = { ...s };
          blobsConfig.forEach((b) => {
            out[b.id] = { ...out[b.id], frown: true, twitch: -6 };
          });
          return out;
        });
        setMouthState((s) => {
          const out = { ...s };
          blobsConfig.forEach((b) => (out[b.id] = "sad"));
          return out;
        });
        // toy reaction
        setToyPeek(false);
        setTimeout(() => setToyPeek(true), 80);
        // revert after delay
        setTimeout(() => {
          setEyebrowState((s) => {
            const out = { ...s };
            blobsConfig.forEach((b) => (out[b.id] = { ...out[b.id], frown: false, twitch: 0 }));
            return out;
          });
          setMouthState((s) => {
            const out = { ...s };
            blobsConfig.forEach((b) => (out[b.id] = "neutral"));
            return out;
          });
        }, 1400);
      } else {
        // success: smile
        setError("");
        setMouthState((s) => {
          const out = { ...s };
          blobsConfig.forEach((b) => (out[b.id] = "smile"));
          return out;
        });
        setToyPeek(true);
        setTimeout(() => setToyPeek(false), 900);
        setTimeout(() => {
          setMouthState((s) => {
            const out = { ...s };
            blobsConfig.forEach((b) => (out[b.id] = "neutral"));
            return out;
          });
        }, 1500);
        alert("Logged in — demo only");
      }
    }, 900);
  }

  // pupil math (bigger)
  function pupilOffset(blobCenterX, blobCenterY, pointerX, pointerY, max) {
    const dx = pointerX - blobCenterX;
    const dy = pointerY - blobCenterY;
    const ang = Math.atan2(dy, dx);
    const dist = Math.min(Math.hypot(dx, dy), 300);
    const factor = clamp(dist / 300, 0, 1);
    return { x: Math.cos(ang) * max * factor, y: Math.sin(ang) * max * factor };
  }

  // RENDER
  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* professional blue background */}
      <div className="absolute inset-0 -z-20">
        <div style={{ width: "100%", height: "100%", overflow: "hidden" }}>
          <div
            style={{
              position: "absolute",
              inset: 0,
              background:
                "radial-gradient(1200px 600px at 10% 20%, rgba(96,165,250,0.18), transparent 12%)," +
                "radial-gradient(900px 500px at 82% 28%, rgba(79,70,229,0.10), transparent 14%)," +
                "linear-gradient(180deg, #061226 0%, #031022 50%, #061226 100%)",
              mixBlendMode: "normal",
              filter: "brightness(1.02)",
              animation: "bgMove 18s ease-in-out infinite",
            }}
          />
          <style>{`
            @keyframes bgMove {
              0% { transform: translate3d(0,0,0) scale(1); }
              50% { transform: translate3d(-20px,8px,0) scale(1.02); }
              100% { transform: translate3d(0px,-16px,0) scale(1); }
            }
          `}</style>
        </div>
      </div>

      <div className="min-h-screen flex">
        {/* LEFT: blobs area */}
        <div ref={leftColRef} className="relative w-1/2 min-h-screen overflow-hidden flex items-center justify-center">
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))" }} />

          {blobsConfig.map((b, idx) => {
            const { baseX, baseY, width, height, left, top } = computeBase(b);
            const sx = smx.get();
            const sy = smy.get();
            const offsetX = sx * b.wobble * 10;
            const offsetY = sy * b.wobble * 8;
            const x = baseX + offsetX;
            const y = baseY + offsetY;
            const isPulsing = (idx === 0 && pulseLeft) || (idx === 1 && pulseRight);
            const size = b.size * (isPulsing ? 1.12 : 1);
            const faceLeft = x - size / 2;
            const faceTop = y - size / 2;
            const pointerPxX = (sx + 0.5) * width + left;
            const pointerPxY = (sy + 0.5) * height + top;
            const pupil = pupilOffset(x, y, pointerPxX, pointerPxY, b.minion ? PUPIL_MAX * 0.8 : PUPIL_MAX);

            const isClosed = blinkState[b.id]?.closed;
            const eyebrow = eyebrowState[b.id] || { frown: false, twitch: 0 };
            const mouth = mouthState[b.id] || "neutral";
            const fillA = flashRed ? "#ff7b7b" : b.colors[0];
            const fillB = flashRed ? "#ff4d4d" : b.colors[1];

            const controls = animControls[b.id];

            // character rendering — minion blobs get goggles; others are refined cartoon faces
            return (
              <motion.div
                key={b.id}
                style={{
                  position: "absolute",
                  left: faceLeft,
                  top: faceTop,
                  width: size,
                  height: size,
                  zIndex: 50 - idx,
                  pointerEvents: "none",
                }}
                animate={controls}
              >
                <motion.svg width="100%" height="100%" viewBox="0 0 200 200" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id={`grad-${b.id}`} x1="0" x2="1">
                      <stop offset="0%" stopColor={fillA} />
                      <stop offset="100%" stopColor={fillB} />
                    </linearGradient>
                    <filter id={`shadow-${b.id}`} x="-50%" y="-50%" width="200%" height="200%">
                      <feDropShadow dx="0" dy="20" stdDeviation="28" floodColor="rgba(2,6,23,0.22)" />
                    </filter>
                  </defs>

                  {/* BODY (refined smooth blob shape) */}
                  <g filter={`url(#shadow-${b.id})`}>
                    <path
                      d="M100,16 C148,18 182,44 180,92 C178,138 140,174 98,178 C46,182 20,148 22,98 C24,52 48,18 100,16 Z"
                      fill={`url(#grad-${b.id})`}
                      stroke={b.stroke || "rgba(0,0,0,0.06)"}
                      strokeWidth="1.5"
                    />
                  </g>

                  {/* If minion: draw goggles band and round lens */}
                  {b.minion ? (
                    <>
                      {/* goggles strap */}
                      <rect x="0" y="70" width="200" height="18" fill="#2b2b2b" opacity="0.9" rx="8" />
                      {/* left lens */}
                      <g transform="translate(62,80)">
                        <ellipse cx="0" cy="0" rx="24" ry="20" fill="#E6E6E6" stroke="#1b1b1b" strokeWidth="3" />
                        {/* pupil behind lens */}
                        <circle cx={pupil.x * 0.5} cy={pupil.y * 0.5} r="8" fill="#1b1b1b" />
                      </g>
                      {/* right lens */}
                      <g transform="translate(138,80)">
                        <ellipse cx="0" cy="0" rx="24" ry="20" fill="#E6E6E6" stroke="#1b1b1b" strokeWidth="3" />
                        <circle cx={pupil.x * 0.5} cy={pupil.y * 0.5} r="8" fill="#1b1b1b" />
                      </g>
                      {/* small smile under goggles */}
                      <motion.path
                        d={mouthPathFor(mouth)}
                        stroke="#1b1b1b"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                        animate={{ d: mouthPathFor(mouth) }}
                        transition={{ duration: MOUTH_MORPH_SPEED, ease: "easeInOut" }}
                      />
                    </>
                  ) : (
                    <>
                      {/* Eyebrows (independent + frown when eyebrow.frown true) */}
                      <g>
                        <motion.line
                          x1="50"
                          y1="58"
                          x2="86"
                          y2="50"
                          stroke="#071225"
                          strokeWidth="4"
                          strokeLinecap="round"
                          animate={eyebrow.frown ? { rotate: -EYEBROW_FROWN_ROT, y: -6 } : { rotate: 0, y: eyebrow.twitch }}
                          style={{ transformOrigin: "center" }}
                          transition={{ type: "spring", stiffness: 140, damping: 12 }}
                        />
                        <motion.line
                          x1="114"
                          y1="50"
                          x2="150"
                          y2="58"
                          stroke="#071225"
                          strokeWidth="4"
                          strokeLinecap="round"
                          animate={eyebrow.frown ? { rotate: EYEBROW_FROWN_ROT, y: -6 } : { rotate: 0, y: eyebrow.twitch }}
                          style={{ transformOrigin: "center" }}
                          transition={{ type: "spring", stiffness: 140, damping: 12 }}
                        />
                      </g>

                      {/* left eye group */}
                      <g transform={`translate(64,80)`}>
                        <ellipse cx="0" cy="0" rx="20" ry="14" fill="#fff" />
                        {/* eyelid rectangle that scales Y from 0 (open) to 1 (closed) — full close */}
                        <motion.rect
                          x="-22"
                          y="-14"
                          width="44"
                          height="28"
                          rx="8"
                          fill={`url(#grad-${b.id})`}
                          animate={{ scaleY: isClosed ? 1 : 0 }}
                          style={{ transformOrigin: "center" }}
                          transition={{ duration: 0.08, ease: "easeInOut" }}
                        />
                        <circle cx={pupil.x * 0.5} cy={pupil.y * 0.5} r="9" fill="#071225" />
                      </g>

                      {/* right eye group */}
                      <g transform={`translate(136,80)`}>
                        <ellipse cx="0" cy="0" rx="20" ry="14" fill="#fff" />
                        <motion.rect
                          x="-22"
                          y="-14"
                          width="44"
                          height="28"
                          rx="8"
                          fill={`url(#grad-${b.id})`}
                          animate={{ scaleY: isClosed ? 1 : 0 }}
                          style={{ transformOrigin: "center" }}
                          transition={{ duration: 0.08, ease: "easeInOut" }}
                        />
                        <circle cx={pupil.x * 0.5} cy={pupil.y * 0.5} r="9" fill="#071225" />
                      </g>

                      {/* mouth (smooth morph) */}
                      <motion.path
                        d={mouthPathFor(mouth)}
                        stroke="#071225"
                        strokeWidth="4"
                        strokeLinecap="round"
                        fill="none"
                        animate={{ d: mouthPathFor(mouth) }}
                        transition={{ duration: MOUTH_MORPH_SPEED, ease: "easeInOut" }}
                      />
                    </>
                  )}

                  {/* subtle specular highlights */}
                  <ellipse cx="64" cy="66" rx="18" ry="8" fill="rgba(255,255,255,0.12)" opacity="0.9" />
                  <ellipse cx="136" cy="66" rx="12" ry="6" fill="rgba(255,255,255,0.08)" />
                </motion.svg>
              </motion.div>
            );
          })}
        </div>

        {/* RIGHT: login card (clean white) */}
        <div className="w-1/2 flex items-center justify-center relative px-8">
          {cardRect && (
            <motion.div
              style={{
                position: "absolute",
                left: cardRect.left - 72 + "px",
                top: cardRect.centerY - 46 + "px",
                width: "92px",
                height: "92px",
                transformOrigin: "center",
                pointerEvents: "none",
                zIndex: 60,
              }}
              animate={{ rotate: toyAngle, y: toyPeek ? -8 : 0 }}
              transition={{ type: "spring", stiffness: 120, damping: 16 }}
            >
              {/* toy SVG */}
              <svg viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <linearGradient id="toyGrad" x1="0" x2="1">
                    <stop offset="0%" stopColor="#fff" stopOpacity="0.98" />
                    <stop offset="100%" stopColor="#eef2ff" stopOpacity="0.95" />
                  </linearGradient>
                </defs>
                <g>
                  <ellipse cx="32" cy="32" rx="30" ry="22" fill="url(#toyGrad)" stroke="#e6edf3" strokeWidth="1" />
                  {!passwordVisible ? (
                    <g>
                      <rect x="8" y="24" width="48" height="12" rx="6" fill="#0f1724" opacity="0.95" />
                    </g>
                  ) : (
                    <g>
                      <circle cx="22" cy="28" r="4" fill="#111827" />
                      <circle cx="42" cy="28" r="4" fill="#111827" />
                    </g>
                  )}
                  <path d="M18 42c4-6 14-6 28 0" stroke="#111827" strokeWidth="2" strokeLinecap="round" fill="none" />
                </g>
              </svg>
            </motion.div>
          )}

          <motion.div
            ref={cardRef}
            initial={{ opacity: 0, y: 18, scale: 0.995 }}
            animate={shakeCard ? { x: [0, -12, 12, -8, 8, 0], opacity: 1 } : { x: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="relative z-20 w-full max-w-md p-8 rounded-2xl bg-white shadow-lg border border-gray-200"
          >
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 3L21 8.5V15.5L12 21L3 15.5V8.5L12 3Z" stroke="#374151" strokeOpacity="0.9" strokeWidth="1.2" />
                </svg>
              </div>
              <div>
                <h1 className="text-gray-900 text-lg font-semibold">Welcome back</h1>
                <p className="text-sm text-gray-500">Sign in to continue to Portable UX</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className={email ? "absolute left-6 -top-3 text-xs px-1 rounded bg-white text-gray-500" : "absolute left-6 -top-3 text-xs px-1 rounded bg-transparent text-gray-500"}>
                  Email
                </label>
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-50">
                  <User size={16} className="text-gray-400" />
                  <input value={email} onChange={(e) => { setEmail(e.target.value); handleKeyInput("email"); }} type="email" placeholder="you@example.com" className="bg-transparent outline-none w-full text-gray-900 placeholder:text-gray-400" />
                </div>
              </div>

              <div>
                <label className={password ? "absolute left-6 -top-3 text-xs px-1 rounded bg-white text-gray-500" : "absolute left-6 -top-3 text-xs px-1 rounded bg-transparent text-gray-500"}>
                  Password
                </label>
                <div className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2 border border-gray-200 focus-within:ring-2 focus-within:ring-indigo-50 relative">
                  <Lock size={16} className="text-gray-400" />
                  <input value={password} onChange={(e) => { setPassword(e.target.value); handleKeyInput("password"); }} type={passwordVisible ? "text" : "password"} placeholder="••••••••" className="bg-transparent outline-none w-full text-gray-900 placeholder:text-gray-400 pr-10" />
                  <button type="button" onClick={() => { togglePassword(); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500">
                    {passwordVisible ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error ? <div className="text-rose-500 text-sm">{error}</div> : null}

              <button type="submit" className="w-full py-3 rounded-lg bg-indigo-600 text-white font-semibold shadow flex items-center justify-center gap-3">
                {loading ? (
                  <span style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,0.45)", borderTop: "2px solid rgba(255,255,255,1)", borderRadius: 999 }} />
                ) : (
                  <>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="opacity-90"><path d="M5 12h14M12 5l7 7-7 7" stroke="white" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
                    <span>Sign in</span>
                  </>
                )}
              </button>

              <div className="flex items-center justify-between text-xs text-gray-500">
                <label className="flex items-center gap-2 text-gray-500">
                  <input type="checkbox" className="accent-indigo-500" /> Remember me
                </label>

                <button type="button" className="underline text-gray-500">Forgot?</button>
              </div>

              <div className="mt-6 flex items-center gap-2">
                <div className="h-[1px] bg-gray-100 flex-1" />
                <div className="text-xs text-gray-400">or continue with</div>
                <div className="h-[1px] bg-gray-100 flex-1" />
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3">
                <button type="button" className="py-2 rounded-lg border border-gray-200 flex items-center justify-center gap-2 bg-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.992 3.657 9.128 8.438 9.876v-6.987H7.898v-2.889h2.54V9.845c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.463h-1.26c-1.242 0-1.63.772-1.63 1.562v1.875h2.773l-.443 2.889h-2.33V21.876C18.343 21.128 22 16.992 22 12z" stroke="#374151" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-sm text-gray-700">Facebook</span>
                </button>

                <button type="button" className="py-2 rounded-lg border border-gray-200 flex items-center justify-center gap-2 bg-white">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none"><path d="M20.66 12.7A8.2 8.2 0 1 0 11.3 3.34l1.52 1.11a5.48 5.48 0 1 1 6.64 7.86l1.2.39z" stroke="#374151" strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span className="text-sm text-gray-700">Google</span>
                </button>
              </div>

              <p className="mt-6 text-center text-sm text-gray-300">Don’t have an account? <button type="button" className="underline">Sign up</button></p>
            </form>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
