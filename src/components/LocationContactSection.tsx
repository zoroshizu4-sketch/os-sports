import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AdvancedMarker,
  APIProvider,
  InfoWindow,
  Map as GoogleMap,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import QRCode from 'qrcode';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  MessageCircle,
  Phone,
} from 'lucide-react';
import { LetterRevealText } from './MotionPrimitives';
import {
  METTUPALAYAM_COORDS,
  VENUE_PHONE_INTL,
  VENUE_PHONE_LOCAL,
  VENUE_WHATSAPP_DIGITS,
} from '../types/turf';

const TurfLocationMarker: React.FC = () => {
  const [markerRef, marker] = useAdvancedMarkerRef();
  const [infoOpen, setInfoOpen] = useState(true);

  return (
    <>
      <AdvancedMarker
        ref={markerRef}
        position={METTUPALAYAM_COORDS}
        onClick={() => setInfoOpen(true)}
        title="OS SPORTS TURF — Mettupalayam, Tamil Nadu"
      >
        <Pin background="#D4AF37" borderColor="#070908" glyphColor="#070908" scale={1.25} />
      </AdvancedMarker>
      {infoOpen && marker && (
        <InfoWindow anchor={marker} onCloseClick={() => setInfoOpen(false)}>
          <div className="text-[#070908] p-1 max-w-[220px]">
            <p className="font-bold text-sm">OS SPORTS TURF</p>
            <p className="text-xs text-neutral-700 mt-0.5">
              Mettupalayam, Tamil Nadu, India
            </p>
            <p className="text-xs text-neutral-600 mt-1">Open-air outdoor football turf</p>
          </div>
        </InfoWindow>
      )}
    </>
  );
};

export const BrandedQRCard: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const publishedUrl =
    typeof window !== 'undefined' ? window.location.origin : 'https://ossportsturf.in';

  useEffect(() => {
    let active = true;
    const renderBrandedCard = async () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const W = 540;
      const H = 680;
      canvas.width = W;
      canvas.height = H;

      // Obsidian background
      ctx.fillStyle = '#070908';
      ctx.fillRect(0, 0, W, H);

      // Subtle green & gold top gradient accent
      const bgGrad = ctx.createRadialGradient(W / 2, 120, 10, W / 2, 120, 320);
      bgGrad.addColorStop(0, 'rgba(21, 128, 61, 0.28)');
      bgGrad.addColorStop(1, 'rgba(7, 9, 8, 0)');
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, W, H);

      // Metallic gold border frame
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 4;
      ctx.strokeRect(20, 20, W - 40, H - 40);
      ctx.strokeStyle = 'rgba(212, 175, 55, 0.35)';
      ctx.lineWidth = 1;
      ctx.strokeRect(30, 30, W - 60, H - 60);

      // Header text
      ctx.fillStyle = '#D4AF37';
      ctx.font = '700 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('OS SPORTS TURF', W / 2, 86);

      ctx.fillStyle = '#4ADE80';
      ctx.font = '600 15px sans-serif';
      ctx.fillText('METTUPALAYAM · TAMIL NADU · INDIA', W / 2, 118);

      // QR Code white pad
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, publishedUrl, {
        width: 310,
        margin: 2,
        color: {
          dark: '#070908',
          light: '#F8F6EE',
        },
        errorCorrectionLevel: 'H',
      });

      const qrBoxSize = 336;
      const qrX = (W - qrBoxSize) / 2;
      const qrY = 152;
      ctx.fillStyle = '#F8F6EE';
      ctx.fillRect(qrX, qrY, qrBoxSize, qrBoxSize);
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 3;
      ctx.strokeRect(qrX, qrY, qrBoxSize, qrBoxSize);
      ctx.drawImage(qrCanvas, qrX + 13, qrY + 13);

      // Footer details
      ctx.fillStyle = '#F4F2EA';
      ctx.font = '600 18px sans-serif';
      ctx.fillText('SCAN TO BOOK ONLINE', W / 2, 542);

      ctx.fillStyle = '#D4AF37';
      ctx.font = '500 16px monospace';
      ctx.fillText(`WhatsApp & Call: ${VENUE_PHONE_LOCAL}`, W / 2, 578);

      ctx.fillStyle = 'rgba(244, 242, 234, 0.65)';
      ctx.font = '400 12px monospace';
      const urlDisplay = publishedUrl.length > 48 ? `${publishedUrl.slice(0, 45)}...` : publishedUrl;
      ctx.fillText(urlDisplay, W / 2, 618);

      if (active) {
        setDownloadUrl(canvas.toDataURL('image/png'));
      }
    };

    renderBrandedCard();
    return () => {
      active = false;
    };
  }, [publishedUrl]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(publishedUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard blocked
    }
  };

  return (
    <div className="rounded-2xl bg-[#0C100E] border border-white/10 p-6 flex flex-col sm:flex-row items-center gap-6">
      <div className="w-44 shrink-0 rounded-xl overflow-hidden border border-[#D4AF37]/30 bg-[#070908]">
        <canvas ref={canvasRef} className="w-full h-auto block" aria-label="OS SPORTS TURF QR Code" />
      </div>

      <div className="flex-1 space-y-3 text-center sm:text-left">
        <h3 className="font-display text-2xl font-bold uppercase text-[#F4F2EA]">
          Branded Pitch QR Pass
        </h3>
        <p className="text-sm text-[#E5E3D8]/75 leading-relaxed">
          Download and print this OS SPORTS TURF poster QR code pointing directly to this live
          booking website.
        </p>
        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1">
          {downloadUrl && (
            <a
              href={downloadUrl}
              download="os-sports-turf-qr.png"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gold-metallic text-[#070908] text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all min-h-[40px]"
            >
              <Download className="w-4 h-4" />
              <span>Download QR PNG</span>
            </a>
          )}
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/15 text-xs font-medium text-[#E5E3D8] hover:border-[#D4AF37] min-h-[40px]"
          >
            {copied ? <Check className="w-4 h-4 text-[#4ADE80]" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Link Copied' : 'Copy Link'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

interface LocationContactSectionProps {
  reducedMotion: boolean;
}

export const LocationContactSection: React.FC<LocationContactSectionProps> = ({
  reducedMotion,
}) => {
  const mapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';
  const googleMapsSearchUrl =
    'https://www.google.com/maps/search/?api=1&query=Mettupalayam+Tamil+Nadu+India';

  return (
    <section
      id="location"
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#090C0A]"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="mb-12"
        >
          <p className="text-xs font-mono-tabular tracking-[0.2em] uppercase text-[#D4AF37] mb-2">
            Location & Direct Contact
          </p>
          <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#F4F2EA]">
            <LetterRevealText text="Find Us in Mettupalayam" reducedMotion={reducedMotion} />
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Interactive Google Map */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: -24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 rounded-2xl overflow-hidden border border-white/10 bg-[#0C100E] min-h-[380px] flex flex-col"
          >
            <div className="flex-1 relative min-h-[340px]">
              {mapsApiKey ? (
                <APIProvider apiKey={mapsApiKey} language="en" region="IN">
                  <GoogleMap
                    defaultCenter={METTUPALAYAM_COORDS}
                    defaultZoom={14}
                    mapId="DEMO_MAP_ID"
                    gestureHandling="cooperative"
                    internalUsageAttributionIds={['gmp_mcp_codeassist_v1_aistudio']}
                    style={{ width: '100%', height: '100%', minHeight: '340px' }}
                  >
                    <TurfLocationMarker />
                  </GoogleMap>
                </APIProvider>
              ) : (
                <div className="w-full h-full min-h-[340px] flex flex-col items-center justify-center p-8 text-center bg-[#0B100D]">
                  <MapPin className="w-10 h-10 text-[#D4AF37] mb-3" />
                  <p className="font-display text-2xl uppercase text-[#F4F2EA]">
                    Mettupalayam, Tamil Nadu, India
                  </p>
                  <p className="mt-2 text-sm text-[#E5E3D8]/70 max-w-sm">
                    Open-air outdoor football turf located in Mettupalayam. Open in Google Maps for
                    turn-by-turn directions.
                  </p>
                </div>
              )}
            </div>
            <div className="px-5 py-4 border-t border-white/10 flex flex-wrap items-center justify-between gap-3 bg-[#070908]">
              <div className="text-xs text-[#E5E3D8]/80">
                <span className="font-semibold text-[#F4F2EA]">OS SPORTS TURF</span> · Mettupalayam,
                Tamil Nadu, India
              </div>
              <a
                href={googleMapsSearchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#D4AF37] hover:text-[#F6E27A]"
              >
                <span>Open in Google Maps</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </motion.div>

          {/* Direct Contact & Branded QR */}
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, x: 24 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.15 }}
            transition={{ duration: 0.55, delay: 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-5 flex flex-col justify-between gap-6"
          >
            <div className="rounded-2xl bg-[#0C100E] border border-white/10 p-6 sm:p-7 space-y-5 hover:border-[#D4AF37]/30 transition-colors">
              <div>
                <h3 className="font-display text-2xl font-bold uppercase text-[#F4F2EA]">
                  Call or WhatsApp
                </h3>
                <p className="mt-1 text-sm text-[#E5E3D8]/70">
                  Reach the turf desk directly for slot inquiries, match timings, or group sessions.
                </p>
              </div>

              <div className="space-y-3">
                <motion.a
                  whileHover={reducedMotion ? undefined : { x: 3 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  href={`tel:${VENUE_PHONE_INTL}`}
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-[#070908] border border-white/15 hover:border-[#D4AF37] transition-colors min-h-[52px]"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold text-[#F4F2EA]">
                    <Phone className="w-4 h-4 text-[#D4AF37]" />
                    <span>Call Turf Desk</span>
                  </span>
                  <span className="font-mono-tabular text-sm text-[#F6E27A]">
                    {VENUE_PHONE_LOCAL}
                  </span>
                </motion.a>

                <motion.a
                  whileHover={reducedMotion ? undefined : { x: 3 }}
                  whileTap={reducedMotion ? undefined : { scale: 0.98 }}
                  href={`https://wa.me/${VENUE_WHATSAPP_DIGITS}?text=${encodeURIComponent(
                    'Hello OS SPORTS TURF, I would like to book a football turf slot in Mettupalayam.'
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-between px-5 py-4 rounded-xl bg-[#15803D] text-white hover:bg-[#169646] transition-colors min-h-[52px]"
                >
                  <span className="flex items-center gap-3 text-sm font-semibold">
                    <MessageCircle className="w-4 h-4" />
                    <span>Chat on WhatsApp</span>
                  </span>
                  <span className="font-mono-tabular text-sm">{VENUE_PHONE_LOCAL}</span>
                </motion.a>
              </div>
            </div>

            <BrandedQRCard />
          </motion.div>
        </div>
      </div>
    </section>
  );
};
