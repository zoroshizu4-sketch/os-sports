import React, { useEffect, useRef, useState } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface LetterRevealProps {
  text: string;
  className?: string;
  delay?: number;
  reducedMotion?: boolean;
}

export const LetterRevealText: React.FC<LetterRevealProps> = ({
  text,
  className = '',
  delay = 0,
  reducedMotion = false,
}) => {
  const containerRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    if (reducedMotion || !containerRef.current) return;
    const chars = containerRef.current.querySelectorAll('.char-unit');
    if (chars.length === 0) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        chars,
        { opacity: 0.15, y: 14 },
        {
          opacity: 1,
          y: 0,
          duration: 0.55,
          stagger: 0.018,
          delay,
          ease: 'power3.out',
          scrollTrigger: {
            trigger: containerRef.current,
            start: 'top 90%',
            once: true,
          },
        }
      );
    }, containerRef);

    return () => ctx.revert();
  }, [delay, reducedMotion, text]);

  if (reducedMotion) {
    return <span className={className}>{text}</span>;
  }

  return (
    <span ref={containerRef} className={`inline-block ${className}`} aria-label={text}>
      {text.split(' ').map((word, wIdx, arr) => (
        <span key={wIdx} className="inline-block whitespace-nowrap">
          {word.split('').map((ch, cIdx) => (
            <span key={cIdx} className="char-unit inline-block will-change-transform">
              {ch}
            </span>
          ))}
          {wIdx < arr.length - 1 && <span className="inline-block">&nbsp;</span>}
        </span>
      ))}
    </span>
  );
};

interface MagneticButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  strength?: number;
  reducedMotion?: boolean;
}

export const MagneticButton: React.FC<MagneticButtonProps> = ({
  children,
  className = '',
  strength = 8,
  reducedMotion = false,
  onClick,
  ...rest
}) => {
  const ref = useRef<HTMLButtonElement | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const handleMove = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (reducedMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const relX = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const relY = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setOffset({ x: relX * strength, y: relY * strength });
  };

  const handleLeave = () => setOffset({ x: 0, y: 0 });

  return (
    <button
      ref={ref}
      type={rest.type || 'button'}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      onClick={onClick}
      style={{
        transform: `translate3d(${offset.x}px, ${offset.y}px, 0)`,
        transition: 'transform 160ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={className}
      {...rest}
    >
      {children}
    </button>
  );
};

interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  reducedMotion?: boolean;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  reducedMotion = false,
}) => {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0 });

  const handleMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (reducedMotion || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    setTilt({ rx: -py * 6, ry: px * 6 });
  };

  const handleLeave = () => setTilt({ rx: 0, ry: 0 });

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMove}
      onMouseLeave={handleLeave}
      style={{
        transform: `perspective(950px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: 'transform 180ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={className}
    >
      {children}
    </div>
  );
};

/**
 * Scroll-triggered rolling football & touchline draw divider between page sections.
 */
export const PitchSectionDivider: React.FC<{ reducedMotion?: boolean }> = ({
  reducedMotion = false,
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const lineRef = useRef<HTMLDivElement | null>(null);
  const ballRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion || !wrapRef.current || !lineRef.current || !ballRef.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        lineRef.current,
        { scaleX: 0.15, opacity: 0.3 },
        {
          scaleX: 1,
          opacity: 1,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top 88%',
            end: 'bottom 25%',
            scrub: 0.6,
          },
        }
      );

      gsap.fromTo(
        ballRef.current,
        { xPercent: -45, rotate: 0 },
        {
          xPercent: 45,
          rotate: 540,
          ease: 'none',
          scrollTrigger: {
            trigger: wrapRef.current,
            start: 'top 88%',
            end: 'bottom 25%',
            scrub: 0.6,
          },
        }
      );
    }, wrapRef);

    return () => ctx.revert();
  }, [reducedMotion]);

  return (
    <div
      ref={wrapRef}
      aria-hidden="true"
      className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 overflow-hidden"
    >
      <div className="relative h-8 flex items-center justify-center">
        <div
          ref={lineRef}
          className="w-full h-[1px] origin-left bg-gradient-to-r from-transparent via-[#D4AF37]/50 to-transparent"
        />
        <div
          ref={ballRef}
          className="absolute inset-x-0 mx-auto w-7 h-7 rounded-full bg-[#090C0A] border border-[#D4AF37]/70 flex items-center justify-center shadow-[0_0_16px_rgba(212,175,55,0.35)]"
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4 text-[#F6E27A]" fill="currentColor">
            <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 3.2l2.9 2.1-1.1 3.4h-3.6L9.1 7.3 12 5.2zm-6.1 4.6l2.3-.7 1.1 3.4-2.1 2.2-2.4-.7a7.8 7.8 0 01-.2-2.1c0-.7.5-1.5 1.3-2.1zm2.8 8.2l1.6-2h3.4l1.6 2a7.8 7.8 0 01-6.6 0zm7.8-2.9l-2.1-2.2 1.1-3.4 2.3.7c.8.6 1.3 1.4 1.3 2.1 0 .7-.1 1.4-.2 2.1l-2.4.7z" />
          </svg>
        </div>
      </div>
    </div>
  );
};

/**
 * Lightweight ambient floating golden sparks canvas across the page.
 */
export const FloatingGoldParticles: React.FC<{ reducedMotion?: boolean }> = ({
  reducedMotion = false,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const motes = Array.from({ length: 28 }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: Math.random() * 1.6 + 0.6,
      vx: (Math.random() - 0.5) * 0.22,
      vy: -(Math.random() * 0.35 + 0.12),
      alpha: Math.random() * 0.45 + 0.15,
    }));

    const onResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', onResize, { passive: true });

    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, width, height);
      for (const m of motes) {
        m.x += m.vx;
        m.y += m.vy;
        if (m.y < -10) {
          m.y = height + 10;
          m.x = Math.random() * width;
        }
        if (m.x < -10) m.x = width + 10;
        if (m.x > width + 10) m.x = -10;

        ctx.beginPath();
        ctx.arc(m.x, m.y, m.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(246, 226, 122, ${m.alpha})`;
        ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
    };
  }, [reducedMotion]);

  if (reducedMotion) return null;

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-10 opacity-75"
    />
  );
};

export const RollingBallScrollTrack: React.FC<{ reducedMotion?: boolean }> = ({
  reducedMotion = false,
}) => {
  const { scrollYProgress } = useScroll();
  const smoothProgress = useSpring(scrollYProgress, { stiffness: 120, damping: 24 });
  const leftPercent = useTransform(smoothProgress, [0, 1], ['2%', '96%']);
  const rotateDeg = useTransform(smoothProgress, [0, 1], [0, 1080]);

  if (reducedMotion) return null;

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 h-1 bg-white/5 hidden md:block"
    >
      <motion.div
        style={{ width: leftPercent }}
        className="h-full bg-gradient-to-r from-[#15803D] via-[#D4AF37] to-[#F6E27A]"
      />
      <motion.div
        style={{ left: leftPercent, rotate: rotateDeg }}
        className="absolute -top-3 -translate-x-1/2 w-5 h-5 rounded-full border border-[#D4AF37] bg-[#0B0E0C] flex items-center justify-center shadow-[0_0_12px_rgba(212,175,55,0.45)]"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 text-[#D4AF37]" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3.2l2.9 2.1-1.1 3.4h-3.6L9.1 7.3 12 5.2zm-6.1 4.6l2.3-.7 1.1 3.4-2.1 2.2-2.4-.7c-.1-.7-.2-1.4-.2-2.1 0-.7.5-1.5 1.3-2.1zm2.8 8.2l1.6-2h3.4l1.6 2c-1 .5-2.1.8-3.3.8s-2.3-.3-3.3-.8zm7.8-2.9l-2.1-2.2 1.1-3.4 2.3.7c.8.6 1.3 1.4 1.3 2.1 0 .7-.1 1.4-.2 2.1l-2.4.7z" />
        </svg>
      </motion.div>
    </div>
  );
};

export const CustomFootballCursor: React.FC<{ reducedMotion?: boolean }> = ({
  reducedMotion = false,
}) => {
  const [visible, setVisible] = useState(false);
  const [hoveringAction, setHoveringAction] = useState(false);
  const dotRef = useRef<HTMLDivElement | null>(null);
  const ringRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (reducedMotion || typeof window === 'undefined') return;
    const finePointer = window.matchMedia('(pointer: fine)').matches;
    if (!finePointer) return;

    let mouseX = -100;
    let mouseY = -100;
    let ringX = -100;
    let ringY = -100;
    let angle = 0;
    let raf = 0;

    const onMove = (e: MouseEvent) => {
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      angle += (dx + dy) * 0.45;
      mouseX = e.clientX;
      mouseY = e.clientY;
      setVisible(true);

      const target = e.target as HTMLElement | null;
      const isInteractive = Boolean(target?.closest('a, button, input, select, textarea, [role="button"]'));
      setHoveringAction(isInteractive);
    };

    const onLeave = () => setVisible(false);

    const loop = () => {
      ringX += (mouseX - ringX) * 0.18;
      ringY += (mouseY - ringY) * 0.18;
      if (dotRef.current) {
        dotRef.current.style.transform = `translate3d(${mouseX}px, ${mouseY}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;
      }
      if (ringRef.current) {
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) translate(-50%, -50%) scale(${hoveringAction ? 1.45 : 1})`;
      }
      raf = requestAnimationFrame(loop);
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('mouseleave', onLeave);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseleave', onLeave);
    };
  }, [hoveringAction, reducedMotion]);

  if (reducedMotion || !visible) return null;

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-50 hidden lg:block">
      <div
        ref={ringRef}
        className="fixed top-0 left-0 w-9 h-9 rounded-full border border-[#D4AF37]/60 transition-[border-color] duration-150"
      />
      <div
        ref={dotRef}
        className="fixed top-0 left-0 w-4 h-4 text-[#F6E27A] drop-shadow-[0_0_8px_rgba(212,175,55,0.65)]"
      >
        <svg viewBox="0 0 24 24" className="w-full h-full" fill="currentColor">
          <path d="M12 2a10 10 0 1010 10A10 10 0 0012 2zm0 3.2l2.9 2.1-1.1 3.4h-3.6L9.1 7.3 12 5.2zm-6.1 4.6l2.3-.7 1.1 3.4-2.1 2.2-2.4-.7a7.8 7.8 0 01-.2-2.1c0-.7.5-1.5 1.3-2.1zm2.8 8.2l1.6-2h3.4l1.6 2a7.8 7.8 0 01-6.6 0zm7.8-2.9l-2.1-2.2 1.1-3.4 2.3.7c.8.6 1.3 1.4 1.3 2.1 0 .7-.1 1.4-.2 2.1l-2.4.7z" />
        </svg>
      </div>
    </div>
  );
};
