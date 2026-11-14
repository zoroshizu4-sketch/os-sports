import React from 'react';
import { motion } from 'motion/react';
import { LetterRevealText, MagneticButton } from './MotionPrimitives';
import {
  TURF_GALLERY_PHOTOS,
  VENUE_WHATSAPP_DIGITS,
  type LightingMode,
} from '../types/turf';

interface HeroPitchSectionProps {
  lightingMode?: LightingMode;
  onChangeLighting?: (mode: LightingMode) => void;
  reducedMotion: boolean;
  onBookClick: () => void;
}

export const HeroPitchSection: React.FC<HeroPitchSectionProps> = ({
  reducedMotion,
  onBookClick,
}) => {
  const heroPhoto = TURF_GALLERY_PHOTOS[0];

  return (
    <section
      id="pitch"
      className="relative w-full h-[calc(100vh-4rem)] min-h-[600px] max-h-[960px] overflow-hidden bg-[#070908]"
    >
      {/* Full-viewport Open-Air Outdoor Turf Hero Backdrop */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <motion.img
          src={heroPhoto.src}
          alt="OS SPORTS TURF open-air outdoor football pitch in Mettupalayam"
          referrerPolicy="no-referrer"
          initial={reducedMotion ? false : { scale: 1.08, opacity: 0.7 }}
          animate={
            reducedMotion
              ? { scale: 1, opacity: 0.9 }
              : { scale: [1.08, 1.02, 1.06], opacity: 0.9 }
          }
          transition={
            reducedMotion
              ? { duration: 0 }
              : {
                  scale: { duration: 18, repeat: Infinity, repeatType: 'reverse', ease: 'easeInOut' },
                  opacity: { duration: 0.9, ease: 'easeOut' },
                }
          }
          className="w-full h-full object-cover will-change-transform"
        />
        {/* Measured contrast scrim on left edge for editorial legibility */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-[#070908]/92 via-[#070908]/55 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#070908] via-[#070908]/45 to-transparent" />
      </div>

      {/* Left-aligned Hero Typography & Primary CTA */}
      <div className="relative z-10 max-w-7xl mx-auto h-full px-4 sm:px-6 lg:px-8 flex flex-col justify-center pointer-events-none">
        <div className="max-w-xl pointer-events-auto">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex items-center gap-2 text-xs font-mono-tabular tracking-[0.2em] uppercase text-[#D4AF37] mb-3"
          >
            <span>Mettupalayam</span>
            <span aria-hidden="true">·</span>
            <span>Tamil Nadu, India</span>
          </motion.div>

          <h1 className="font-display text-4xl sm:text-6xl lg:text-7xl font-extrabold uppercase tracking-tight text-[#F4F2EA] leading-[0.95] [text-wrap:balance]">
            <LetterRevealText text="Open-Air Football." reducedMotion={reducedMotion} />
            <span className="block text-gold-metallic mt-1">
              <LetterRevealText
                text="Under Sky or Floodlights."
                delay={0.18}
                reducedMotion={reducedMotion}
              />
            </span>
          </h1>

          <motion.p
            initial={reducedMotion ? false : { opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="mt-5 text-sm sm:text-base text-[#E5E3D8]/85 leading-relaxed max-w-md"
          >
            Outdoor green football turf framed by perimeter boundary nets, regulation goalposts, and
            full-pitch floodlight towers.
          </motion.p>

          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.38, ease: [0.16, 1, 0.3, 1] }}
            className="mt-7 flex flex-wrap items-center gap-4"
          >
            <MagneticButton
              reducedMotion={reducedMotion}
              onClick={onBookClick}
              className="px-7 py-3.5 rounded-xl bg-gold-metallic text-[#070908] font-display text-lg font-bold tracking-wider uppercase shadow-[0_8px_30px_rgba(212,175,55,0.3)] hover:brightness-110 transition-all min-h-[44px] whitespace-nowrap"
            >
              Book a Pitch Slot
            </MagneticButton>
            <a
              href={`https://wa.me/${VENUE_WHATSAPP_DIGITS}?text=${encodeURIComponent(
                'Hello OS SPORTS TURF, I would like to inquire about booking the outdoor football pitch in Mettupalayam.'
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-6 py-3.5 rounded-xl bg-[#0B0E0C]/90 border border-[#D4AF37]/40 text-[#F4F2EA] text-sm font-semibold hover:border-[#D4AF37] hover:text-[#F6E27A] transition-colors min-h-[44px] inline-flex items-center whitespace-nowrap"
            >
              WhatsApp Booking
            </a>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
