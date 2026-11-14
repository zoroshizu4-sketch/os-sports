import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  collection,
  doc,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from 'firebase/firestore';
import { Calendar, CheckCircle2, Clock, Lock, MessageCircle, ShieldAlert } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { LetterRevealText, MagneticButton } from './MotionPrimitives';
import {
  VENUE_WHATSAPP_DIGITS,
  type SlotLock,
  type VenueSettings,
} from '../types/turf';
import { soundEngine } from '../utils/soundEngine';

interface BookingSectionProps {
  venueSettings: VenueSettings;
  reducedMotion: boolean;
}

function getTodayLocalDateStr(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatHourLabel(hour24: number): string {
  const h = hour24 % 24;
  const suffix = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:00 ${suffix}`;
}

export const BookingSection: React.FC<BookingSectionProps> = ({
  venueSettings,
  reducedMotion,
}) => {
  const todayStr = useMemo(() => getTodayLocalDateStr(), []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);
  const [startHour, setStartHour] = useState<number | null>(null);
  const [durationHours, setDurationHours] = useState<number>(1);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [notes, setNotes] = useState('');

  const [slotLocks, setSlotLocks] = useState<Record<number, SlotLock>>({});
  const [loadingSlots, setLoadingSlots] = useState<boolean>(true);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmedBooking, setConfirmedBooking] = useState<{
    bookingRef: string;
    date: string;
    startHour: number;
    durationHours: number;
    customerName: string;
    customerPhone: string;
    quotedTotal: number | null;
  } | null>(null);

  // Real-time Firestore listener on public non-PII slotLocks for selected date
  useEffect(() => {
    setLoadingSlots(true);
    setSlotsError(null);
    const q = query(collection(db, 'slotLocks'), where('date', '==', selectedDate));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const map: Record<number, SlotLock> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          if (typeof data.hour === 'number') {
            map[data.hour] = {
              id: docSnap.id,
              date: data.date,
              hour: data.hour,
              status: data.status,
              bookingId: data.bookingId,
            };
          }
        });
        setSlotLocks(map);
        setLoadingSlots(false);
      },
      (err) => {
        setLoadingSlots(false);
        setSlotsError('Unable to load live slot availability. Please refresh or use WhatsApp.');
        try {
          handleFirestoreError(err, OperationType.LIST, 'slotLocks');
        } catch {
          // Logged by handleFirestoreError
        }
      }
    );
    return () => unsub();
  }, [selectedDate]);

  // Compute hourly slots from real venue settings
  const operatingHours = useMemo(() => {
    const hours: number[] = [];
    for (let h = venueSettings.openHour; h < venueSettings.closeHour; h++) {
      hours.push(h);
    }
    return hours;
  }, [venueSettings.openHour, venueSettings.closeHour]);

  const currentLocalHour = new Date().getHours();
  const isToday = selectedDate === todayStr;

  const isHourFree = (h: number): boolean => {
    if (h < venueSettings.openHour || h >= venueSettings.closeHour) return false;
    if (isToday && h <= currentLocalHour) return false;
    if (slotLocks[h]) return false;
    return true;
  };

  const canBookDurationAt = (h: number, dur: number): boolean => {
    for (let i = 0; i < dur; i++) {
      if (!isHourFree(h + i)) return false;
    }
    return true;
  };

  // Clear startHour if it became unavailable
  useEffect(() => {
    if (startHour !== null && !canBookDurationAt(startHour, durationHours)) {
      setStartHour(null);
    }
  }, [slotLocks, durationHours, selectedDate, startHour]);

  // Compute total strictly from Admin-published rates (null if not set)
  const computedQuote = useMemo((): number | null => {
    if (startHour === null) return null;
    const dayRate = venueSettings.dayRatePerHour;
    const nightRate = venueSettings.nightRatePerHour;
    if (dayRate === null && nightRate === null) return null;

    let sum = 0;
    for (let i = 0; i < durationHours; i++) {
      const h = startHour + i;
      const isNight = h >= venueSettings.nightStartHour;
      const rate = isNight ? (nightRate ?? dayRate) : (dayRate ?? nightRate);
      if (rate === null || rate === undefined) return null;
      sum += rate;
    }
    return sum;
  }, [
    startHour,
    durationHours,
    venueSettings.dayRatePerHour,
    venueSettings.nightRatePerHour,
    venueSettings.nightStartHour,
  ]);

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (startHour === null) {
      setSubmitError('Please select an available start time slot.');
      return;
    }

    const trimmedName = customerName.trim();
    const cleanedPhone = customerPhone.replace(/[^\d+]/g, '');
    if (trimmedName.length < 2 || trimmedName.length > 80) {
      setSubmitError('Please enter a valid full name (2–80 characters).');
      return;
    }
    if (cleanedPhone.length < 10 || cleanedPhone.length > 15) {
      setSubmitError('Please enter a valid 10–15 digit mobile / WhatsApp number.');
      return;
    }
    if (!canBookDurationAt(startHour, durationHours)) {
      setSubmitError('Selected time slot is no longer available for that duration.');
      return;
    }

    setSubmitting(true);
    const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
    const bookingId = `bk_${selectedDate.replace(/-/g, '')}_${startHour}_${Date.now()}_${randomSuffix}`;
    const bookingRef = `OS-${selectedDate.replace(/-/g, '').slice(2)}-${randomSuffix}`;

    try {
      await runTransaction(db, async (tx) => {
        // 1. Verify every hourly lock does NOT already exist
        const lockRefs = [];
        for (let i = 0; i < durationHours; i++) {
          const hour = startHour + i;
          const lockId = `${selectedDate}_${hour}`;
          const lockRef = doc(db, 'slotLocks', lockId);
          const lockSnap = await tx.get(lockRef);
          if (lockSnap.exists()) {
            throw new Error('SLOT_ALREADY_TAKEN');
          }
          lockRefs.push({ hour, lockRef });
        }

        // 2. Atomically create booking & all hourly slotLocks
        const bookingDocRef = doc(db, 'bookings', bookingId);
        tx.set(bookingDocRef, {
          bookingRef,
          date: selectedDate,
          startHour,
          durationHours,
          customerName: trimmedName,
          customerPhone: cleanedPhone,
          notes: notes.trim().slice(0, 300),
          status: 'pending',
          quotedTotal: computedQuote,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        for (const item of lockRefs) {
          tx.set(item.lockRef, {
            date: selectedDate,
            hour: item.hour,
            status: 'booked',
            bookingId,
            createdAt: serverTimestamp(),
          });
        }
      });

      soundEngine.playChime();
      setConfirmedBooking({
        bookingRef,
        date: selectedDate,
        startHour,
        durationHours,
        customerName: trimmedName,
        customerPhone: cleanedPhone,
        quotedTotal: computedQuote,
      });
      setStartHour(null);
      setNotes('');
    } catch (err) {
      if (err instanceof Error && err.message === 'SLOT_ALREADY_TAKEN') {
        setSubmitError('That slot was just booked by another player. Please choose another available time.');
      } else {
        setSubmitError('Could not complete online reservation. Please try again or confirm via WhatsApp.');
        try {
          handleFirestoreError(err, OperationType.WRITE, 'bookings');
        } catch {
          // Diagnostic logged
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const buildWhatsAppBookingUrl = (info: {
    bookingRef?: string;
    date: string;
    startHour: number | null;
    durationHours: number;
    customerName: string;
    customerPhone: string;
    quotedTotal: number | null;
  }) => {
    const timeText =
      info.startHour !== null
        ? `${formatHourLabel(info.startHour)} – ${formatHourLabel(info.startHour + info.durationHours)}`
        : 'Time to confirm';
    const rateLine =
      info.quotedTotal !== null ? `Quoted Total: ₹${info.quotedTotal}` : 'Rate: Please confirm';
    const refLine = info.bookingRef ? `Booking Ref: ${info.bookingRef}\n` : '';
    const msg =
      `Hello OS SPORTS TURF (Mettupalayam),\n` +
      `${refLine}` +
      `Date: ${info.date}\n` +
      `Slot: ${timeText} (${info.durationHours} hr${info.durationHours > 1 ? 's' : ''})\n` +
      `Name: ${info.customerName || 'Guest'}\n` +
      `Phone: ${info.customerPhone || 'Not provided'}\n` +
      `${rateLine}`;
    return `https://wa.me/${VENUE_WHATSAPP_DIGITS}?text=${encodeURIComponent(msg)}`;
  };

  const hasPublishedRates =
    venueSettings.dayRatePerHour !== null || venueSettings.nightRatePerHour !== null;

  return (
    <section
      id="booking"
      className="py-20 sm:py-28 px-4 sm:px-6 lg:px-8 border-t border-white/10 bg-[#070908]"
    >
      <div className="max-w-7xl mx-auto">
        <motion.div
          initial={reducedMotion ? false : { opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-10"
        >
          <div>
            <p className="text-xs font-mono-tabular tracking-[0.2em] uppercase text-[#D4AF37] mb-2">
              Live Database Availability
            </p>
            <h2 className="font-display text-3xl sm:text-5xl font-bold uppercase tracking-tight text-[#F4F2EA]">
              <LetterRevealText text="Reserve Your Pitch Slot" reducedMotion={reducedMotion} />
            </h2>
          </div>

          <div className="text-sm text-[#E5E3D8]/80 max-w-md">
            {hasPublishedRates ? (
              <div className="flex flex-wrap items-center gap-4 font-mono-tabular text-xs">
                {venueSettings.dayRatePerHour !== null && (
                  <span>Day Rate: ₹{venueSettings.dayRatePerHour}/hr</span>
                )}
                {venueSettings.nightRatePerHour !== null && (
                  <span className="text-[#F6E27A]">
                    Floodlight Rate (from {formatHourLabel(venueSettings.nightStartHour)}): ₹
                    {venueSettings.nightRatePerHour}/hr
                  </span>
                )}
              </div>
            ) : (
              <span>
                Hourly pricing is confirmed directly by OS SPORTS TURF upon booking or via WhatsApp.
              </span>
            )}
          </div>
        </motion.div>

        {venueSettings.announcement && (
          <motion.div
            initial={reducedMotion ? false : { opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
            className="mb-8 rounded-xl bg-[#111713] border border-[#D4AF37]/30 px-5 py-3.5 text-sm text-[#F6E27A]"
          >
            {venueSettings.announcement}
          </motion.div>
        )}

        <AnimatePresence mode="wait">
        {confirmedBooking ? (
          <motion.div
            key="booking-confirmed"
            initial={reducedMotion ? false : { opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reducedMotion ? undefined : { opacity: 0, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
            className="rounded-2xl bg-[#0D130F] border border-[#15803D]/60 p-8 sm:p-10 max-w-2xl mx-auto"
          >
            <div className="flex items-center gap-3 text-[#4ADE80]">
              <CheckCircle2 className="w-7 h-7 shrink-0" />
              <h3 className="font-display text-3xl font-bold uppercase">
                Slot Reserved in Schedule
              </h3>
            </div>
            <p className="mt-3 text-sm text-[#E5E3D8]/80">
              Your requested hours are locked in our live calendar with double-booking protection.
              Send your reservation details on WhatsApp to finalize with the venue team.
            </p>

            <dl className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 py-5 border-y border-white/10 text-sm">
              <div>
                <dt className="text-xs text-[#E5E3D8]/55 uppercase">Reference</dt>
                <dd className="font-mono-tabular text-base font-semibold text-[#F6E27A]">
                  {confirmedBooking.bookingRef}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#E5E3D8]/55 uppercase">Date</dt>
                <dd className="font-mono-tabular text-base">{confirmedBooking.date}</dd>
              </div>
              <div>
                <dt className="text-xs text-[#E5E3D8]/55 uppercase">Time & Duration</dt>
                <dd className="font-mono-tabular text-base">
                  {formatHourLabel(confirmedBooking.startHour)} –{' '}
                  {formatHourLabel(confirmedBooking.startHour + confirmedBooking.durationHours)} (
                  {confirmedBooking.durationHours} hr{confirmedBooking.durationHours > 1 ? 's' : ''})
                </dd>
              </div>
              <div>
                <dt className="text-xs text-[#E5E3D8]/55 uppercase">Rate Summary</dt>
                <dd className="font-mono-tabular text-base">
                  {confirmedBooking.quotedTotal !== null
                    ? `₹${confirmedBooking.quotedTotal}`
                    : 'Confirm via WhatsApp'}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <a
                href={buildWhatsAppBookingUrl(confirmedBooking)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3.5 rounded-xl bg-[#15803D] text-white font-semibold text-sm hover:bg-[#169646] transition-colors min-h-[44px]"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Send Confirmation on WhatsApp</span>
              </a>
              <button
                type="button"
                onClick={() => setConfirmedBooking(null)}
                className="px-5 py-3.5 rounded-xl border border-white/15 text-sm font-medium text-[#E5E3D8] hover:border-[#D4AF37] min-h-[44px]"
              >
                Book Another Slot
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="booking-form"
            initial={reducedMotion ? false : { opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.1 }}
            transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start"
          >
            {/* Left Column: Date, Duration & Live Firestore Slot Picker */}
            <div className="lg:col-span-7 rounded-2xl bg-[#0C100E] border border-white/10 p-6 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 pb-6 border-b border-white/10">
                <div>
                  <label
                    htmlFor="booking-date"
                    className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D4AF37] mb-2"
                  >
                    <Calendar className="w-4 h-4" />
                    <span>Match Date</span>
                  </label>
                  <input
                    id="booking-date"
                    type="date"
                    min={todayStr}
                    value={selectedDate}
                    onChange={(e) => {
                      if (e.target.value) setSelectedDate(e.target.value);
                    }}
                    className="w-full px-4 py-3 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular text-[#F4F2EA] focus:outline-none focus:border-[#D4AF37]"
                  />
                </div>

                <div>
                  <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#D4AF37] mb-2">
                    <Clock className="w-4 h-4" />
                    <span>Duration</span>
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {[1, 2, 3, 4].map((hrs) => {
                      const isDurActive = durationHours === hrs;
                      return (
                        <motion.button
                          key={hrs}
                          type="button"
                          whileTap={reducedMotion ? undefined : { scale: 0.95 }}
                          onClick={() => setDurationHours(hrs)}
                          className={`relative py-3 rounded-xl text-xs font-mono-tabular font-semibold border transition-colors min-h-[44px] ${
                            isDurActive
                              ? 'text-[#070908] border-[#D4AF37]'
                              : 'bg-[#070908] text-[#E5E3D8] border-white/15 hover:border-[#D4AF37]/50'
                          }`}
                        >
                          {isDurActive && (
                            <motion.span
                              layoutId={reducedMotion ? undefined : 'durationActiveHighlight'}
                              transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                              className="absolute inset-0 rounded-[11px] bg-[#D4AF37]"
                              aria-hidden="true"
                            />
                          )}
                          <span className="relative z-10">{hrs} hr</span>
                        </motion.button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                  <h3 className="font-display text-xl uppercase tracking-wide text-[#F4F2EA]">
                    Select Kickoff Time
                  </h3>
                  <div className="flex items-center gap-4 text-xs text-[#E5E3D8]/70">
                    <span>Available</span>
                    <span aria-hidden="true">·</span>
                    <span>Booked / Blocked</span>
                  </div>
                </div>

                {slotsError && (
                  <div className="mb-4 rounded-xl bg-red-950/40 border border-red-500/40 p-4 text-xs text-red-200 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>{slotsError}</span>
                  </div>
                )}

                {loadingSlots ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div
                        key={i}
                        className="h-14 rounded-xl bg-white/5 animate-pulse border border-white/10"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                    {operatingHours.map((hour) => {
                      const lock = slotLocks[hour];
                      const isPast = isToday && hour <= currentLocalHour;
                      const fitsDuration = canBookDurationAt(hour, durationHours);
                      const isSelected =
                        startHour !== null && hour >= startHour && hour < startHour + durationHours;
                      const isNightSlot = hour >= venueSettings.nightStartHour;

                      let statusLabel = 'Open';
                      if (lock?.status === 'booked') statusLabel = 'Booked';
                      else if (lock?.status === 'blocked') statusLabel = 'Blocked';
                      else if (isPast) statusLabel = 'Past';
                      else if (!fitsDuration) statusLabel = 'Short';

                      return (
                        <motion.button
                          key={hour}
                          type="button"
                          disabled={!fitsDuration}
                          whileHover={fitsDuration && !reducedMotion ? { y: -2 } : undefined}
                          whileTap={fitsDuration && !reducedMotion ? { scale: 0.96 } : undefined}
                          onClick={() => setStartHour(hour)}
                          className={`px-3 py-2.5 rounded-xl border text-left transition-colors min-h-[54px] flex flex-col justify-between ${
                            isSelected
                              ? 'bg-[#15803D] border-[#4ADE80] text-white shadow-[0_0_18px_rgba(21,128,61,0.35)]'
                              : fitsDuration
                                ? 'bg-[#070908] border-white/15 text-[#F4F2EA] hover:border-[#D4AF37]'
                                : 'bg-[#070908]/40 border-white/5 text-[#E5E3D8]/35 cursor-not-allowed'
                          }`}
                        >
                          <span className="font-mono-tabular text-xs font-semibold">
                            {formatHourLabel(hour)}
                          </span>
                          <span className="flex items-center justify-between text-[11px] mt-1">
                            <span>{statusLabel}</span>
                            {!fitsDuration ? (
                              <Lock className="w-3 h-3 opacity-60" />
                            ) : isNightSlot ? (
                              <span className="text-[#F6E27A]">Floodlit</span>
                            ) : (
                              <span className="text-[#4ADE80]">Day</span>
                            )}
                          </span>
                        </motion.button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Customer Details & Atomic Submission */}
            <form
              onSubmit={handleSubmitBooking}
              className="lg:col-span-5 rounded-2xl bg-[#0C100E] border border-white/10 p-6 sm:p-8 space-y-5"
            >
              <div>
                <h3 className="font-display text-2xl font-bold uppercase text-[#F4F2EA]">
                  Player & Booking Details
                </h3>
                <p className="mt-1 text-xs text-[#E5E3D8]/65">
                  Instant slot reservation with database double-booking protection.
                </p>
              </div>

              <div className="rounded-xl bg-[#070908] border border-white/10 p-4 text-xs space-y-1.5 font-mono-tabular">
                <div className="flex justify-between">
                  <span className="text-[#E5E3D8]/60">Date</span>
                  <span>{selectedDate}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E5E3D8]/60">Selected Time</span>
                  <span className="text-[#F6E27A]">
                    {startHour !== null
                      ? `${formatHourLabel(startHour)} – ${formatHourLabel(
                          startHour + durationHours
                        )}`
                      : 'Select a slot on the left'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#E5E3D8]/60">Duration</span>
                  <span>
                    {durationHours} hr{durationHours > 1 ? 's' : ''}
                  </span>
                </div>
                <div className="flex justify-between pt-1.5 border-t border-white/10">
                  <span className="text-[#E5E3D8]/60">Estimated Rate</span>
                  <span>
                    {computedQuote !== null ? `₹${computedQuote}` : 'Confirm via WhatsApp'}
                  </span>
                </div>
              </div>

              <div>
                <label
                  htmlFor="customer-name"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#E5E3D8]/80 mb-1.5"
                >
                  Full Name
                </label>
                <input
                  id="customer-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Enter your name"
                  className="w-full px-4 py-3 rounded-xl bg-[#070908] border border-white/15 text-sm text-[#F4F2EA] placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label
                  htmlFor="customer-phone"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#E5E3D8]/80 mb-1.5"
                >
                  Mobile / WhatsApp Number
                </label>
                <input
                  id="customer-phone"
                  type="tel"
                  required
                  minLength={10}
                  maxLength={15}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="10-digit phone number"
                  className="w-full px-4 py-3 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular text-[#F4F2EA] placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <div>
                <label
                  htmlFor="booking-notes"
                  className="block text-xs font-semibold uppercase tracking-wider text-[#E5E3D8]/80 mb-1.5"
                >
                  Match Notes (Optional)
                </label>
                <textarea
                  id="booking-notes"
                  rows={2}
                  maxLength={300}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Team name or timing notes"
                  className="w-full px-4 py-2.5 rounded-xl bg-[#070908] border border-white/15 text-sm text-[#F4F2EA] placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
              </div>

              <AnimatePresence>
                {submitError && (
                  <motion.div
                    initial={reducedMotion ? false : { opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reducedMotion ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.2 }}
                    className="rounded-xl bg-red-950/40 border border-red-500/40 p-3.5 text-xs text-red-200"
                  >
                    {submitError}
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="space-y-3 pt-1">
                <MagneticButton
                  type="submit"
                  disabled={submitting || startHour === null}
                  reducedMotion={reducedMotion}
                  className="w-full py-3.5 px-6 rounded-xl bg-gold-metallic text-[#070908] font-display text-lg font-bold uppercase tracking-wider disabled:opacity-45 disabled:cursor-not-allowed hover:brightness-110 transition-all min-h-[46px]"
                >
                  {submitting ? 'Locking Slot...' : 'Lock & Reserve Slot'}
                </MagneticButton>

                <a
                  href={buildWhatsAppBookingUrl({
                    date: selectedDate,
                    startHour,
                    durationHours,
                    customerName,
                    customerPhone,
                    quotedTotal: computedQuote,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-3 px-6 rounded-xl bg-[#070908] border border-[#15803D]/60 text-[#4ADE80] text-sm font-semibold inline-flex items-center justify-center gap-2 hover:bg-[#15803D]/15 transition-colors min-h-[44px]"
                >
                  <MessageCircle className="w-4 h-4" />
                  <span>Book Directly via WhatsApp</span>
                </a>
              </div>
            </form>
          </motion.div>
        )}
        </AnimatePresence>
      </div>
    </section>
  );
};
