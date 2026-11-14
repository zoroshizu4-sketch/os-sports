import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from './lib/firebase';
import {
  DEFAULT_VENUE_SETTINGS,
  VENUE_PHONE_INTL,
  VENUE_PHONE_LOCAL,
  VENUE_WHATSAPP_DIGITS,
  type LightingMode,
  type VenueSettings,
} from './types/turf';
import { TopBar } from './components/TopBar';
import { HeroPitchSection } from './components/HeroPitchSection';
import { ShowcaseGallerySection } from './components/ShowcaseGallerySection';
import { BookingSection } from './components/BookingSection';
import { LocationContactSection } from './components/LocationContactSection';
import { AdminDashboard } from './components/AdminDashboard';
import {
  CustomFootballCursor,
  FloatingGoldParticles,
  PitchSectionDivider,
  RollingBallScrollTrack,
} from './components/MotionPrimitives';

export default function App() {
  const [lightingMode, setLightingMode] = useState<LightingMode>('sunset');
  const [adminOpen, setAdminOpen] = useState(false);
  const [mapsQuotaExceeded, setMapsQuotaExceeded] = useState(false);
  const [venueSettings, setVenueSettings] = useState<VenueSettings>(DEFAULT_VENUE_SETTINGS);
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  // Listen to prefers-reduced-motion changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Google Maps Platform quota banner listener
  useEffect(() => {
    const onQuota = () => setMapsQuotaExceeded(true);
    window.addEventListener('gmp-quota-exceeded', onQuota);
    return () => window.removeEventListener('gmp-quota-exceeded', onQuota);
  }, []);

  // Subscribe to public venue settings from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, 'settings', 'venue'),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setVenueSettings({
            openHour: typeof d.openHour === 'number' ? d.openHour : 5,
            closeHour: typeof d.closeHour === 'number' ? d.closeHour : 23,
            nightStartHour: typeof d.nightStartHour === 'number' ? d.nightStartHour : 18,
            dayRatePerHour: typeof d.dayRatePerHour === 'number' ? d.dayRatePerHour : null,
            nightRatePerHour: typeof d.nightRatePerHour === 'number' ? d.nightRatePerHour : null,
            currency: typeof d.currency === 'string' ? d.currency : 'INR',
            customFacilities: Array.isArray(d.customFacilities) ? d.customFacilities : [],
            announcement: typeof d.announcement === 'string' ? d.announcement : '',
          });
        }
      },
      () => {
        // Fallback silently to defaults if settings doc not yet created
      }
    );
    return () => unsub();
  }, []);

  const jumpToBooking = () => {
    const el = document.getElementById('booking');
    if (el) {
      el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#070908] text-[#F4F2EA] flex flex-col">
      {/* Google Maps Platform Demo Quota Banner */}
      {mapsQuotaExceeded && (
        <div className="bg-amber-50 border-b border-amber-200 text-amber-900 px-4 py-2.5 text-xs md:text-sm text-center sticky top-0 z-50 shadow-sm">
          <span>
            Google Maps Platform quota reached. If you are the app owner, visit{' '}
            <a
              href="https://developers.google.com/maps/ai/ai-studio?utm_campaign=gmp_mcp_codeassist_v1_aistudio#quota_exceeded_errors"
              target="_blank"
              rel="noopener noreferrer"
              className="underline font-semibold text-amber-950 hover:text-amber-800"
            >
              maps developer site
            </a>{' '}
            for instructions to update your account.
          </span>
        </div>
      )}

      {/* Ambient Floating Golden Sparks, Custom Cursor & Rolling Football Track */}
      <FloatingGoldParticles reducedMotion={reducedMotion} />
      <CustomFootballCursor reducedMotion={reducedMotion} />
      <RollingBallScrollTrack reducedMotion={reducedMotion} />

      {/* Main Website Shell */}
      <TopBar
        onOpenAdmin={() => setAdminOpen(true)}
        onJumpToBooking={jumpToBooking}
      />

      <main className="flex-1 relative z-20">
        <HeroPitchSection
          lightingMode={lightingMode}
          onChangeLighting={setLightingMode}
          reducedMotion={reducedMotion}
          onBookClick={jumpToBooking}
        />

        <PitchSectionDivider reducedMotion={reducedMotion} />

        <ShowcaseGallerySection
          venueSettings={venueSettings}
          reducedMotion={reducedMotion}
        />

        <PitchSectionDivider reducedMotion={reducedMotion} />

        <BookingSection
          venueSettings={venueSettings}
          reducedMotion={reducedMotion}
        />

        <PitchSectionDivider reducedMotion={reducedMotion} />

        <LocationContactSection reducedMotion={reducedMotion} />
      </main>

      {/* Quiet Editorial Footer */}
      <footer className="relative z-20 border-t border-white/10 bg-[#050706] py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
          <div>
            <p className="font-display text-2xl font-extrabold uppercase text-gold-metallic">
              OS SPORTS TURF
            </p>
            <p className="mt-1 text-xs text-[#E5E3D8]/65">
              Open-Air Outdoor Football Turf · Mettupalayam, Tamil Nadu, India
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs text-[#E5E3D8]/80">
            <a href="#pitch" className="hover:text-[#F6E27A] transition-colors">
              Pitch 3D
            </a>
            <a href="#showcase" className="hover:text-[#F6E27A] transition-colors">
              Facilities
            </a>
            <a href="#gallery" className="hover:text-[#F6E27A] transition-colors">
              Gallery
            </a>
            <a href="#booking" className="hover:text-[#F6E27A] transition-colors">
              Book Slot
            </a>
            <a href={`tel:${VENUE_PHONE_INTL}`} className="hover:text-[#F6E27A] transition-colors">
              Call {VENUE_PHONE_LOCAL}
            </a>
            <a
              href={`https://wa.me/${VENUE_WHATSAPP_DIGITS}`}
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#4ADE80] transition-colors"
            >
              WhatsApp
            </a>
            <button
              type="button"
              onClick={() => setAdminOpen(true)}
              className="hover:text-[#F6E27A] transition-colors"
            >
              Admin
            </button>
          </div>
        </div>
      </footer>

      {/* Secure Admin Dashboard Modal */}
      <AdminDashboard
        open={adminOpen}
        onClose={() => setAdminOpen(false)}
        venueSettings={venueSettings}
      />
    </div>
  );
}
