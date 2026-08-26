import { useEffect, useRef, useState, useCallback } from 'react';

const SEGMENTS = 22;
const GRAVITY = 0.5;
const DAMPING = 0.98;
const CONSTRAINT_ITERS = 10;
const SESSION_KEY = 'portfolioIntroPlayed';

export default function RopeIntro({ onComplete }) {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const stateRef = useRef(null);

  // Keep the latest onComplete in a ref so the main effect never has to
  // depend on it. This is the fix for the "flashes then disappears" bug:
  // if the parent re-renders (e.g. cursor-tracking effects on mousemove),
  // an inline onComplete={() => ...} prop gets a new identity every time,
  // which used to tear down and rebuild the whole canvas/physics setup.
  const onCompleteRef = useRef(onComplete);
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const [showPrompt, setShowPrompt] = useState(false);
  const [promptY, setPromptY] = useState(0);
  const [fadeOut, setFadeOut] = useState(false);
  const [skip, setSkip] = useState(false);

  // Scene should only ever play once per browser session.
  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setSkip(true);
      onCompleteRef.current?.();
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (stateRef.current && stateRef.current.transitioning) return;
    if (stateRef.current) stateRef.current.transitioning = true;
    sessionStorage.setItem(SESSION_KEY, 'true');
    setFadeOut(true);
    setTimeout(() => onCompleteRef.current?.(), 800);
  }, []); // stable forever — no dependency on the onComplete prop

  useEffect(() => {
    if (skip) return; // don't even set up the canvas if we're skipping
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    // Make the canvas fill the viewport regardless of any external CSS.
    canvas.style.position = 'fixed';
    canvas.style.inset = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.display = 'block';
    canvas.style.touchAction = 'none';

    let width = 0;
    let height = 0;
    let centerX = 0;
    let segLen = 0;

    function resize() {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      centerX = width / 2;
      segLen = (height * 0.38) / SEGMENTS;

      if (stateRef.current) {
        stateRef.current.width = width;
        stateRef.current.height = height;
        stateRef.current.centerX = centerX;
        stateRef.current.segLen = segLen;

        if (!stateRef.current.dropped && stateRef.current.points) {
          for (let i = 0; i <= SEGMENTS; i++) {
            const y = i * segLen;
            stateRef.current.points[i].x = centerX;
            stateRef.current.points[i].y = y;
            stateRef.current.points[i].ox = centerX;
            stateRef.current.points[i].oy = y;
          }
        } else if (stateRef.current.points && stateRef.current.points[0]) {
          stateRef.current.points[0].x = centerX;
          stateRef.current.points[0].ox = centerX;
        }
      }
    }

    const initWidth = window.innerWidth;
    const initHeight = window.innerHeight;
    const initCenterX = initWidth / 2;
    const initSegLen = (initHeight * 0.38) / SEGMENTS;

    const points = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const y = i * initSegLen;
      points.push({ x: initCenterX, y, ox: initCenterX, oy: y, pinned: true });
    }

    const state = {
      points,
      width: initWidth,
      height: initHeight,
      centerX: initCenterX,
      segLen: initSegLen,
      dropped: false,
      grabbed: false,
      mouseX: initCenterX,
      mouseY: initHeight * 0.38,
      restY: initHeight * 0.38,
      transitioning: false,
    };
    stateRef.current = state;

    resize();
    window.addEventListener('resize', resize);

    const dropTimer = setTimeout(() => {
      const st = stateRef.current;
      if (!st) return;
      st.dropped = true;

      const pts = st.points;
      pts[0].pinned = true;
      pts[0].x = st.centerX;
      pts[0].y = 0;
      pts[0].ox = st.centerX;
      pts[0].oy = 0;

      for (let i = 1; i < pts.length; i++) {
        pts[i].pinned = false;
        pts[i].ox = pts[i].x + (Math.random() - 0.5) * 4;
      }

      setShowPrompt(true);
      const last = pts[pts.length - 1];
      setPromptY(last.y + 45);
    }, 2000);

    function update() {
      const st = stateRef.current;
      if (!st || !st.dropped || st.transitioning) return;
      const pts = st.points;
      const sLen = st.segLen;

      for (let i = 0; i < pts.length; i++) {
        if (pts[i].pinned) continue;

        if (st.grabbed && i === pts.length - 1) {
          pts[i].ox = pts[i].x;
          pts[i].oy = pts[i].y;
          pts[i].x = st.mouseX;
          pts[i].y = st.mouseY;
          continue;
        }

        const vx = (pts[i].x - pts[i].ox) * DAMPING;
        const vy = (pts[i].y - pts[i].oy) * DAMPING;
        pts[i].ox = pts[i].x;
        pts[i].oy = pts[i].y;
        pts[i].x += vx;
        pts[i].y += vy + GRAVITY;
      }

      for (let iter = 0; iter < CONSTRAINT_ITERS; iter++) {
        for (let i = 0; i < pts.length - 1; i++) {
          const a = pts[i];
          const b = pts[i + 1];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d === 0) continue;
          const diff = ((d - sLen) / d) * 0.5;
          const ox = dx * diff;
          const oy = dy * diff;
          if (!a.pinned) { a.x += ox; a.y += oy; }
          if (!b.pinned && !(st.grabbed && i + 1 === pts.length - 1)) {
            b.x -= ox; b.y -= oy;
          }
        }
      }

      const last = pts[pts.length - 1];
      if (!st.grabbed) setPromptY(last.y + 45);

      const restY = st.height * 0.38;
      if (st.grabbed) {
        if (st.mouseY - restY > 150 || last.y - restY > 150) {
          st.grabbed = false;
          handleComplete();
        }
      }
    }

    function draw() {
      const st = stateRef.current;
      if (!st) return;

      ctx.clearRect(0, 0, st.width, st.height);

      if (!st.dropped) {
        frameRef.current = requestAnimationFrame(draw);
        return;
      }

      update();
      const pts = st.points;

      ctx.beginPath();
      ctx.moveTo(pts[0].x + 3, pts[0].y + 3);
      for (let i = 1; i < pts.length; i++) {
        if (i < pts.length - 1) {
          const mx = (pts[i].x + pts[i + 1].x) / 2 + 3;
          const my = (pts[i].y + pts[i + 1].y) / 2 + 3;
          ctx.quadraticCurveTo(pts[i].x + 3, pts[i].y + 3, mx, my);
        } else {
          ctx.lineTo(pts[i].x + 3, pts[i].y + 3);
        }
      }
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.08)';
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        if (i < pts.length - 1) {
          const mx = (pts[i].x + pts[i + 1].x) / 2;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x, pts[i].y, mx, my);
        } else {
          ctx.lineTo(pts[i].x, pts[i].y);
        }
      }
      ctx.strokeStyle = '#6B4226';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(pts[0].x - 1.5, pts[0].y);
      for (let i = 1; i < pts.length; i++) {
        if (i < pts.length - 1) {
          const mx = (pts[i].x + pts[i + 1].x) / 2 - 1.5;
          const my = (pts[i].y + pts[i + 1].y) / 2;
          ctx.quadraticCurveTo(pts[i].x - 1.5, pts[i].y, mx, my);
        } else {
          ctx.lineTo(pts[i].x - 1.5, pts[i].y);
        }
      }
      ctx.strokeStyle = 'rgba(220, 190, 150, 0.5)';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      for (let i = 2; i < pts.length - 1; i += 2) {
        const p = pts[i];
        const next = pts[Math.min(i + 1, pts.length - 1)];
        const prev = pts[Math.max(i - 1, 0)];
        const angle = Math.atan2(next.y - prev.y, next.x - prev.x);
        const perpX = Math.cos(angle + Math.PI / 2) * 3.5;
        const perpY = Math.sin(angle + Math.PI / 2) * 3.5;

        ctx.beginPath();
        ctx.moveTo(p.x - perpX, p.y - perpY);
        ctx.lineTo(p.x + perpX, p.y + perpY);
        ctx.strokeStyle = 'rgba(40, 25, 15, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      const last = pts[pts.length - 1];
      ctx.beginPath();
      ctx.arc(last.x, last.y, 12, 0, Math.PI * 2);
      const grad = ctx.createRadialGradient(last.x - 3, last.y - 3, 1, last.x, last.y, 12);
      grad.addColorStop(0, '#D2B48C');
      grad.addColorStop(0.4, '#5A361E');
      grad.addColorStop(1, '#3A2010');
      ctx.fillStyle = grad;
      ctx.fill();
      ctx.strokeStyle = '#2A180B';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      if (!st.grabbed && !st.transitioning) {
        let isHoveringRope = false;
        for (let i = pts.length - 8; i < pts.length; i++) {
          const p = pts[i];
          const dx = st.mouseX - p.x;
          const dy = st.mouseY - p.y;
          if (dx * dx + dy * dy < 85 * 85) { isHoveringRope = true; break; }
        }
        canvas.style.cursor = isHoveringRope ? 'grab' : 'default';
      } else if (st.grabbed) {
        canvas.style.cursor = 'grabbing';
      }

      frameRef.current = requestAnimationFrame(draw);
    }

    frameRef.current = requestAnimationFrame(draw);

    function handleDown(cx, cy) {
      const st = stateRef.current;
      if (!st || !st.dropped || st.transitioning) return;
      const pts = st.points;
      for (let i = pts.length - 8; i < pts.length; i++) {
        const p = pts[i];
        const dx = cx - p.x;
        const dy = cy - p.y;
        if (dx * dx + dy * dy < 85 * 85) {
          st.grabbed = true;
          st.mouseX = cx;
          st.mouseY = cy;
          break;
        }
      }
    }
    function handleMove(cx, cy) {
      const st = stateRef.current;
      if (!st) return;
      st.mouseX = cx;
      st.mouseY = cy;
    }
    function handleUp() {
      const st = stateRef.current;
      if (st) st.grabbed = false;
    }

    const onMD = (e) => handleDown(e.clientX, e.clientY);
    const onMM = (e) => handleMove(e.clientX, e.clientY);
    const onMU = () => handleUp();
    const onTS = (e) => { e.preventDefault(); handleDown(e.touches[0].clientX, e.touches[0].clientY); };
    const onTM = (e) => { e.preventDefault(); handleMove(e.touches[0].clientX, e.touches[0].clientY); };
    const onTE = () => handleUp();

    canvas.addEventListener('mousedown', onMD);
    window.addEventListener('mousemove', onMM);
    window.addEventListener('mouseup', onMU);
    canvas.addEventListener('touchstart', onTS, { passive: false });
    window.addEventListener('touchmove', onTM, { passive: false });
    window.addEventListener('touchend', onTE);

    return () => {
      clearTimeout(dropTimer);
      cancelAnimationFrame(frameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousedown', onMD);
      window.removeEventListener('mousemove', onMM);
      window.removeEventListener('mouseup', onMU);
      canvas.removeEventListener('touchstart', onTS);
      window.removeEventListener('touchmove', onTM);
      window.removeEventListener('touchend', onTE);
    };
    // Empty dep array: this must run exactly ONCE on mount, no matter how
    // many times the parent re-renders. handleComplete is stable (useCallback
    // with no deps) and onComplete is read through a ref, so nothing here
    // ever goes stale.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [skip]);

  if (skip) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#FFFFFF',
        zIndex: 9999,
        opacity: fadeOut ? 0 : 1,
        filter: fadeOut ? 'blur(8px)' : 'blur(0px)',
        transform: fadeOut ? 'scale(1.05)' : 'scale(1)',
        transition: 'opacity 0.8s ease, filter 0.8s ease, transform 0.8s ease',
        pointerEvents: fadeOut ? 'none' : 'auto',
      }}
    >
      <canvas ref={canvasRef} />

      {showPrompt && !fadeOut && (
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: `${promptY}px`,
            transform: 'translateX(-50%)',
            textAlign: 'center',
            fontFamily: 'system-ui, sans-serif',
            color: '#4a4a4a',
            letterSpacing: '0.15em',
            fontSize: '13px',
            fontWeight: 600,
            textTransform: 'uppercase',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        >
          <p style={{ margin: 0 }}>Pull this rope</p>
          <span style={{ display: 'block', marginTop: 6, fontSize: 16 }}>↓</span>
        </div>
      )}

      <button
        onClick={handleComplete}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          padding: '10px 20px',
          borderRadius: 999,
          border: '1px solid #ccc',
          background: 'transparent',
          color: '#444',
          fontSize: 12,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >
        Skip Intro
      </button>
    </div>
  );
}