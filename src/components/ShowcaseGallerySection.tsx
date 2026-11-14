import React, { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Maximize2, X } from 'lucide-react';
import { LetterRevealText, TiltCard } from './MotionPrimitives';
import { TURF_GALLERY_PHOTOS, type GalleryPhoto, type VenueSettings } from '../types/turf';

interface ShowcaseGallerySectionProps {
  venueSettings: VenueSettings;
  reducedMotion: boolean;
}

export const ShowcaseGallerySection: React.FC<ShowcaseGallerySectionProps> = ({
  venueSettings,
  reducedMotion,
}) => {
  const [galleryFilter, setGalleryFilter] = useState<'all' | 'aerial' | 'floodlights' | 'pitch'>('all');
  const [lightboxPhoto, setLightboxPhoto] = useState<GalleryPhoto | null>(null);

  const filteredPhotos =
    galleryFilter === 'all'
      ? TURF_GALLERY_PHOTOS
      : TURF_GALLERY_PHOTOS.filter((p) => p.category === galleryFilter);

  const corePitchFeatures = [
    {
      num: '01',
      title: 'Open-Air Football Turf',
      detail:
        'Unroofed outdoor football pitch set under open Tamil Nadu sky with natural daylight and evening breeze.',
      span: 'lg:col-span-2',
    },
    {
      num: '02',
      title: 'Perimeter Boundary Nets',
      detail:
        'High-tension perimeter safety netting enclosing all four touchlines to keep play continuous and fast.',
      span: 'lg:col-span-1',
    },
    {
      num: '03',
      title: 'Regulation Goalposts',
      detail:
        'Sturdy white goal frames with crisp match netting anchored cleanly at both ends of the green surface.',
      span: 'lg:col-span-1',
    },
    {
      num: '04',
      title: 'Outdoor Floodlight Towers',
      detail:
        'Dedicated corner floodlight masts delivering clear evening and night visibility across every zone of the pitch.',
      span: 'lg:col-span-2',
    },
  ];

  return (
    <>
      {/* SECTION: Outdoor Turf Showcase */}
      <section id="showcase" className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12"
        >
          <div>
            <p className="text-xs font-mono-tabular tracking-[0.2em] uppercase text-[#D4AF37] mb-2">
              Open-Air Facility · Mettupalayam
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#F4F2EA] [text-wrap:balance]">
              <LetterRevealText text="Built for Outdoor Football" reducedMotion={reducedMotion} />
            </h2>
          </div>
          <p className="text-sm sm:text-base text-[#E5E3D8]/75 max-w-md leading-relaxed">
            Every element on site is focused on open-air match play—lush green turf, full boundary
            nets, regulation goalposts, and outdoor floodlights.
          </p>
        </motion.div>

        {/* Asymmetric Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {corePitchFeatures.map((item, idx) => (
            <motion.div
              key={item.num}
              initial={reducedMotion ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.5, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
              className={item.span}
            >
              <TiltCard
                reducedMotion={reducedMotion}
                className="h-full rounded-2xl bg-[#0D120F] border border-white/10 p-7 flex flex-col justify-between hover:border-[#D4AF37]/45 transition-colors"
              >
                <div>
                  <span className="font-mono-tabular text-xs text-[#D4AF37] tracking-widest">
                    {item.num}
                  </span>
                  <h3 className="mt-3 font-display text-2xl sm:text-3xl font-bold uppercase text-[#F4F2EA]">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm sm:text-base text-[#E5E3D8]/75 leading-relaxed">
                    {item.detail}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs text-[#4ADE80]">
                  <span>Open-Air Pitch Standard</span>
                </div>
              </TiltCard>
            </motion.div>
          ))}
        </div>

        {/* Admin-Verified Additional Facilities (Rendered ONLY if Admin added them in Firestore) */}
        {venueSettings.customFacilities.length > 0 && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="mt-8 rounded-2xl bg-[#0B0E0C] border border-white/10 p-6"
          >
            <h3 className="font-display text-xl uppercase tracking-wide text-[#F6E27A] mb-3">
              Venue Notes & Amenities
            </h3>
            <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm text-[#E5E3D8]/85">
              {venueSettings.customFacilities.map((facility, idx) => (
                <li key={idx} className="py-1.5 border-b border-white/10">
                  {facility}
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </section>

      {/* SECTION: Real-Photo Gallery */}
      <section
        id="gallery"
        className="py-20 sm:py-24 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#090C0A]"
      >
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-10"
          >
            <div>
              <p className="text-xs font-mono-tabular tracking-[0.2em] uppercase text-[#D4AF37] mb-2">
                Visual Tour
              </p>
              <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#F4F2EA]">
                <LetterRevealText text="Pitch & Floodlight Gallery" reducedMotion={reducedMotion} />
              </h2>
            </div>

            {/* Interactive Filter Tabs */}
            <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5 self-start sm:self-auto">
              {[
                { id: 'all', label: 'All Views' },
                { id: 'aerial', label: 'Aerial' },
                { id: 'floodlights', label: 'Floodlights' },
                { id: 'pitch', label: 'Pitch & Nets' },
              ].map((tab) => {
                const isActive = galleryFilter === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setGalleryFilter(tab.id as 'all' | 'aerial' | 'floodlights' | 'pitch')
                    }
                    className={`relative px-3.5 py-2 rounded-md text-xs font-medium transition-colors whitespace-nowrap ${
                      isActive ? 'text-[#070908] font-bold' : 'text-[#E5E3D8]/75 hover:text-white'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId={reducedMotion ? undefined : 'galleryActiveTab'}
                        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                        className="absolute inset-0 rounded-md bg-[#D4AF37]"
                        aria-hidden="true"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredPhotos.map((photo, idx) => (
                <motion.div
                  key={photo.id}
                  layout={!reducedMotion}
                  initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 18 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={reducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
                  transition={{
                    duration: 0.35,
                    delay: idx * 0.05,
                    ease: [0.16, 1, 0.3, 1],
                  }}
                >
                  <TiltCard
                    reducedMotion={reducedMotion}
                    className="group relative rounded-2xl overflow-hidden bg-[#101512] border border-white/10 hover:border-[#D4AF37]/50 transition-colors"
                  >
                    <div
                      className={`relative w-full overflow-hidden bg-gradient-to-br from-[#0F2417] to-[#070908] ${
                        photo.aspect === '16:9' ? 'aspect-video' : 'aspect-[4/3]'
                      }`}
                    >
                      <img
                        src={photo.src}
                        alt={photo.title}
                        referrerPolicy="no-referrer"
                        loading="lazy"
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-[#070908]/90 via-black/25 to-transparent" />

                      <button
                        type="button"
                        onClick={() => setLightboxPhoto(photo)}
                        aria-label={`Inspect ${photo.title}`}
                        className="absolute top-4 right-4 w-10 h-10 rounded-lg bg-black/70 border border-white/20 text-[#F4F2EA] flex items-center justify-center opacity-90 hover:border-[#D4AF37] hover:text-[#F6E27A] hover:scale-105 transition-all"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </button>

                      <div className="absolute bottom-0 inset-x-0 p-6">
                        <h3 className="font-display text-2xl font-bold uppercase text-[#F4F2EA]">
                          {photo.title}
                        </h3>
                        <p className="mt-1 text-sm text-[#E5E3D8]/80 leading-relaxed">
                          {photo.caption}
                        </p>
                      </div>
                    </div>
                  </TiltCard>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </div>
      </section>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {lightboxPhoto && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reducedMotion ? undefined : { opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-black/92 flex items-center justify-center p-4 sm:p-8"
            role="dialog"
            aria-label={lightboxPhoto.title}
            onClick={() => setLightboxPhoto(null)}
          >
            <motion.div
              initial={reducedMotion ? false : { opacity: 0, scale: 0.94, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="relative max-w-5xl w-full rounded-2xl overflow-hidden bg-[#0B0E0C] border border-white/15"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => setLightboxPhoto(null)}
                aria-label="Close gallery preview"
                className="absolute top-4 right-4 z-10 w-11 h-11 rounded-lg bg-black/75 border border-white/20 text-white flex items-center justify-center hover:border-[#D4AF37] transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
              <img
                src={lightboxPhoto.src}
                alt={lightboxPhoto.title}
                referrerPolicy="no-referrer"
                className="w-full max-h-[75vh] object-contain bg-black"
              />
              <div className="p-5 border-t border-white/10">
                <h3 className="font-display text-2xl font-bold uppercase text-[#F6E27A]">
                  {lightboxPhoto.title}
                </h3>
                <p className="mt-1 text-sm text-[#E5E3D8]/80">{lightboxPhoto.caption}</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
