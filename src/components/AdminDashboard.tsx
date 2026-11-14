import React, { useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
} from 'firebase/firestore';
import {
  CalendarCheck,
  Check,
  Eye,
  EyeOff,
  Lock,
  LogOut,
  MessageCircle,
  Plus,
  Settings,
  Shield,
  Trash2,
  Unlock,
  X,
} from 'lucide-react';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  ADMIN_EMAIL,
  VENUE_WHATSAPP_DIGITS,
  type BookingRecord,
  type SlotLock,
  type VenueSettings,
} from '../types/turf';

interface AdminDashboardProps {
  open: boolean;
  onClose: () => void;
  venueSettings: VenueSettings;
}

function formatHour(h: number): string {
  const hr = h % 24;
  const suffix = hr >= 12 ? 'PM' : 'AM';
  const h12 = hr % 12 === 0 ? 12 : hr % 12;
  return `${h12}:00 ${suffix}`;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  open,
  onClose,
  venueSettings,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [pinInput, setPinInput] = useState('');
  const [pinUnlocked, setPinUnlocked] = useState(false);
  const [pinError, setPinError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState<'bookings' | 'pricing' | 'availability'>('bookings');

  // Bookings state
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'confirmed' | 'cancelled'>(
    'all'
  );
  const [actionBusy, setActionBusy] = useState<string | null>(null);

  // Settings form state
  const [openHour, setOpenHour] = useState(venueSettings.openHour);
  const [closeHour, setCloseHour] = useState(venueSettings.closeHour);
  const [nightStartHour, setNightStartHour] = useState(venueSettings.nightStartHour);
  const [dayRate, setDayRate] = useState(
    venueSettings.dayRatePerHour !== null ? String(venueSettings.dayRatePerHour) : ''
  );
  const [nightRate, setNightRate] = useState(
    venueSettings.nightRatePerHour !== null ? String(venueSettings.nightRatePerHour) : ''
  );
  const [announcement, setAnnouncement] = useState(venueSettings.announcement || '');
  const [facilities, setFacilities] = useState<string[]>(venueSettings.customFacilities || []);
  const [newFacility, setNewFacility] = useState('');
  const [settingsNotice, setSettingsNotice] = useState<string | null>(null);

  // Availability manager state
  const todayStr = new Date().toISOString().slice(0, 10);
  const [availDate, setAvailDate] = useState(todayStr);
  const [dateLocks, setDateLocks] = useState<Record<number, SlotLock>>({});

  useEffect(() => {
    setOpenHour(venueSettings.openHour);
    setCloseHour(venueSettings.closeHour);
    setNightStartHour(venueSettings.nightStartHour);
    setDayRate(venueSettings.dayRatePerHour !== null ? String(venueSettings.dayRatePerHour) : '');
    setNightRate(
      venueSettings.nightRatePerHour !== null ? String(venueSettings.nightRatePerHour) : ''
    );
    setAnnouncement(venueSettings.announcement || '');
    setFacilities(venueSettings.customFacilities || []);
  }, [venueSettings]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (current) => {
      setUser(current);
      setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  const isVerifiedAdmin = Boolean(
    user && user.email === ADMIN_EMAIL && user.emailVerified
  );
  const canAccessAdminData = pinUnlocked && isVerifiedAdmin;

  // Listen to bookings only when password unlocked and verified admin opens dashboard
  useEffect(() => {
    if (!open || !canAccessAdminData) return;

    const q = query(collection(db, 'bookings'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: BookingRecord[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            bookingRef: data.bookingRef,
            date: data.date,
            startHour: data.startHour,
            durationHours: data.durationHours,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            notes: data.notes || '',
            status: data.status,
            quotedTotal: data.quotedTotal ?? null,
          });
        });
        setBookings(list);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'bookings');
        } catch {
          // Diagnostic logged
        }
      }
    );
    return () => unsub();
  }, [open, canAccessAdminData]);

  // Listen to slotLocks for selected availability management date
  useEffect(() => {
    if (!open || !canAccessAdminData) return;
    const q = query(collection(db, 'slotLocks'), where('date', '==', availDate));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const map: Record<number, SlotLock> = {};
        snap.forEach((d) => {
          const data = d.data();
          map[data.hour] = {
            id: d.id,
            date: data.date,
            hour: data.hour,
            status: data.status,
            bookingId: data.bookingId,
          };
        });
        setDateLocks(map);
      },
      (err) => {
        try {
          handleFirestoreError(err, OperationType.LIST, 'slotLocks');
        } catch {
          // Logged
        }
      }
    );
    return () => unsub();
  }, [open, canAccessAdminData, availDate]);

  if (!open) return null;

  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput.trim() === '040911') {
      setPinUnlocked(true);
      setPinInput('');
      setPinError(null);
    } else {
      setPinError('Incorrect admin password. Please try again.');
    }
  };

  const handleLockAdmin = () => {
    setPinUnlocked(false);
    setPinInput('');
    setPinError(null);
  };

  const handleGoogleSignIn = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : 'Sign-in could not be completed. Please allow popups.'
      );
    }
  };

  const handleConfirmBooking = async (booking: BookingRecord) => {
    setActionBusy(booking.id);
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'bookings', booking.id);
        tx.update(ref, {
          status: 'confirmed',
          updatedAt: serverTimestamp(),
        });
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setActionBusy(null);
    }
  };

  const handleCancelAndRelease = async (booking: BookingRecord) => {
    setActionBusy(booking.id);
    try {
      await runTransaction(db, async (tx) => {
        const ref = doc(db, 'bookings', booking.id);
        tx.update(ref, {
          status: 'cancelled',
          updatedAt: serverTimestamp(),
        });
        for (let i = 0; i < booking.durationHours; i++) {
          const lockId = `${booking.date}_${booking.startHour + i}`;
          tx.delete(doc(db, 'slotLocks', lockId));
        }
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `bookings/${booking.id}`);
    } finally {
      setActionBusy(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsNotice(null);
    if (closeHour <= openHour) {
      setSettingsNotice('Closing hour must be after opening hour.');
      return;
    }

    const parsedDay = dayRate.trim() === '' ? null : Number(dayRate);
    const parsedNight = nightRate.trim() === '' ? null : Number(nightRate);

    if (
      (parsedDay !== null && (Number.isNaN(parsedDay) || parsedDay < 0)) ||
      (parsedNight !== null && (Number.isNaN(parsedNight) || parsedNight < 0))
    ) {
      setSettingsNotice('Please enter valid non-negative rates or leave blank.');
      return;
    }

    try {
      await setDoc(
        doc(db, 'settings', 'venue'),
        {
          openHour,
          closeHour,
          nightStartHour,
          dayRatePerHour: parsedDay,
          nightRatePerHour: parsedNight,
          currency: 'INR',
          customFacilities: facilities.slice(0, 12),
          announcement: announcement.trim().slice(0, 240),
          updatedAt: serverTimestamp(),
        },
        { merge: false }
      );
      setSettingsNotice('Venue pricing & schedule saved.');
    } catch (err) {
      setSettingsNotice('Failed to save settings.');
      try {
        handleFirestoreError(err, OperationType.WRITE, 'settings/venue');
      } catch {
        // Logged
      }
    }
  };

  const toggleManualBlock = async (hour: number) => {
    const existingLock = dateLocks[hour];
    const lockId = `${availDate}_${hour}`;
    if (existingLock) {
      if (existingLock.status === 'booked') return; // Cancel via Bookings tab
      try {
        await deleteDoc(doc(db, 'slotLocks', lockId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `slotLocks/${lockId}`);
      }
    } else {
      try {
        await setDoc(doc(db, 'slotLocks', lockId), {
          date: availDate,
          hour,
          status: 'blocked',
          bookingId: 'admin_block',
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `slotLocks/${lockId}`);
      }
    }
  };

  const filteredBookings =
    statusFilter === 'all' ? bookings : bookings.filter((b) => b.status === statusFilter);

  return (
    <div
      className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4"
      role="dialog"
      aria-label="OS SPORTS TURF Admin Dashboard"
    >
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-[#0B0E0C] border border-[#D4AF37]/30 overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Shield className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="font-display text-2xl font-bold uppercase text-[#F4F2EA]">
              Admin Operations
            </h2>
          </div>
          <div className="flex items-center gap-3">
            {pinUnlocked && (
              <button
                type="button"
                onClick={handleLockAdmin}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs text-[#E5E3D8] hover:border-[#D4AF37]"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Lock</span>
              </button>
            )}
            {user && (
              <button
                type="button"
                onClick={() => {
                  setPinUnlocked(false);
                  signOut(auth);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs text-[#E5E3D8] hover:border-[#D4AF37]"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close Admin Dashboard"
              className="w-10 h-10 rounded-lg border border-white/15 text-[#E5E3D8] flex items-center justify-center hover:border-[#D4AF37]"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {!pinUnlocked ? (
            <form onSubmit={handlePinSubmit} className="py-12 max-w-sm mx-auto text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center">
                <Lock className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold uppercase text-[#F4F2EA]">
                  Enter Admin Password
                </h3>
                <p className="mt-2 text-sm text-[#E5E3D8]/75">
                  Enter the OS SPORTS TURF administrator password to unlock operations.
                </p>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  inputMode="numeric"
                  autoComplete="current-password"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    if (pinError) setPinError(null);
                  }}
                  placeholder="Enter admin password"
                  aria-label="Admin password"
                  autoFocus
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-[#070908] border border-white/15 text-center text-base font-mono-tabular tracking-[0.25em] text-[#F4F2EA] placeholder:tracking-normal placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-[#E5E3D8]/60 hover:text-[#F6E27A]"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {pinError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-200">
                  {pinError}
                </div>
              )}
              <button
                type="submit"
                className="w-full inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gold-metallic text-[#070908] font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all min-h-[44px]"
              >
                Unlock Admin
              </button>
            </form>
          ) : authLoading ? (
            <div className="py-16 text-center text-sm text-[#E5E3D8]/70">
              Checking authentication...
            </div>
          ) : !user ? (
            <div className="py-12 max-w-md mx-auto text-center space-y-5">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-[#15803D]/20 border border-[#4ADE80]/40 flex items-center justify-center">
                <Shield className="w-6 h-6 text-[#4ADE80]" />
              </div>
              <div>
                <h3 className="font-display text-2xl font-bold uppercase text-[#F4F2EA]">
                  Authorize Venue Google Account
                </h3>
                <p className="mt-2 text-sm text-[#E5E3D8]/75">
                  Password verified. Sign in with the authorized venue Google account to access live
                  bookings, rates, and slot availability.
                </p>
              </div>
              {authError && (
                <div className="p-3 rounded-xl bg-red-950/50 border border-red-500/40 text-xs text-red-200">
                  {authError}
                </div>
              )}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-gold-metallic text-[#070908] font-bold text-sm uppercase tracking-wider hover:brightness-110 transition-all"
              >
                Sign In with Google
              </button>
            </div>
          ) : !isVerifiedAdmin ? (
            <div className="py-12 max-w-md mx-auto text-center space-y-4">
              <h3 className="font-display text-2xl font-bold uppercase text-red-400">
                Access Restricted
              </h3>
              <p className="text-sm text-[#E5E3D8]/80">
                Signed in as <span className="font-mono-tabular">{user.email}</span>. Only the
                verified venue administrator account can access booking records and pricing controls.
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Admin Tabs */}
              <div className="flex flex-wrap items-center gap-2 p-1 rounded-xl bg-white/5 w-fit">
                {[
                  { id: 'bookings', label: 'Bookings', icon: <CalendarCheck className="w-4 h-4" /> },
                  { id: 'pricing', label: 'Pricing & Hours', icon: <Settings className="w-4 h-4" /> },
                  { id: 'availability', label: 'Block Slots', icon: <Lock className="w-4 h-4" /> },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() =>
                      setActiveTab(tab.id as 'bookings' | 'pricing' | 'availability')
                    }
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      activeTab === tab.id
                        ? 'bg-[#D4AF37] text-[#070908]'
                        : 'text-[#E5E3D8]/75 hover:text-white'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                  </button>
                ))}
              </div>

              {/* TAB 1: Bookings Management */}
              {activeTab === 'bookings' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-white/5">
                      {(['all', 'pending', 'confirmed', 'cancelled'] as const).map((st) => (
                        <button
                          key={st}
                          type="button"
                          onClick={() => setStatusFilter(st)}
                          className={`px-3 py-1.5 rounded-md text-xs capitalize transition-colors ${
                            statusFilter === st
                              ? 'bg-white/15 text-[#F6E27A] font-semibold'
                              : 'text-[#E5E3D8]/70 hover:text-white'
                          }`}
                        >
                          {st}
                        </button>
                      ))}
                    </div>
                    <span className="font-mono-tabular text-xs text-[#E5E3D8]/60">
                      {filteredBookings.length} record{filteredBookings.length === 1 ? '' : 's'}
                    </span>
                  </div>

                  {filteredBookings.length === 0 ? (
                    <div className="py-12 text-center rounded-xl border border-white/10 text-sm text-[#E5E3D8]/60">
                      No bookings match this filter yet.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {filteredBookings.map((bk) => (
                        <div
                          key={bk.id}
                          className="rounded-xl bg-[#070908] border border-white/10 p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-2 text-xs font-mono-tabular">
                              <span className="text-[#F6E27A] font-semibold">{bk.bookingRef}</span>
                              <span>·</span>
                              <span>{bk.date}</span>
                              <span>·</span>
                              <span>
                                {formatHour(bk.startHour)} –{' '}
                                {formatHour(bk.startHour + bk.durationHours)}
                              </span>
                              <span>·</span>
                              <span
                                className={
                                  bk.status === 'confirmed'
                                    ? 'text-[#4ADE80]'
                                    : bk.status === 'cancelled'
                                      ? 'text-red-400'
                                      : 'text-amber-300'
                                }
                              >
                                {bk.status.toUpperCase()}
                              </span>
                            </div>
                            <p className="text-sm font-semibold text-[#F4F2EA]">
                              {bk.customerName} —{' '}
                              <span className="font-mono-tabular text-[#E5E3D8]/80">
                                {bk.customerPhone}
                              </span>
                            </p>
                            {bk.notes && (
                              <p className="text-xs text-[#E5E3D8]/65">Notes: {bk.notes}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-2 shrink-0">
                            <a
                              href={`https://wa.me/${
                                bk.customerPhone.replace(/\D/g, '').length === 10
                                  ? `91${bk.customerPhone.replace(/\D/g, '')}`
                                  : bk.customerPhone.replace(/\D/g, '') || VENUE_WHATSAPP_DIGITS
                              }?text=${encodeURIComponent(
                                `Hello ${bk.customerName}, regarding your OS SPORTS TURF booking (${bk.bookingRef}) on ${bk.date} at ${formatHour(bk.startHour)}.`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-white/15 text-xs text-[#E5E3D8] hover:border-[#4ADE80]"
                            >
                              <MessageCircle className="w-3.5 h-3.5 text-[#4ADE80]" />
                              <span>WhatsApp</span>
                            </a>

                            {bk.status === 'pending' && (
                              <button
                                type="button"
                                disabled={actionBusy === bk.id}
                                onClick={() => handleConfirmBooking(bk)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#15803D] text-white text-xs font-semibold hover:bg-[#169646] disabled:opacity-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Confirm</span>
                              </button>
                            )}

                            {bk.status !== 'cancelled' && (
                              <button
                                type="button"
                                disabled={actionBusy === bk.id}
                                onClick={() => handleCancelAndRelease(bk)}
                                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs font-semibold hover:bg-red-900/60 disabled:opacity-50"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Cancel & Release</span>
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: Pricing, Operating Hours & Venue Notes */}
              {activeTab === 'pricing' && (
                <form onSubmit={handleSaveSettings} className="space-y-5 max-w-2xl">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-[#E5E3D8]/70 mb-1.5">
                        Open Hour (0-23)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={22}
                        value={openHour}
                        onChange={(e) => setOpenHour(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-[#E5E3D8]/70 mb-1.5">
                        Close Hour (1-24)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={closeHour}
                        onChange={(e) => setCloseHour(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-[#E5E3D8]/70 mb-1.5">
                        Floodlight Start (0-23)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={nightStartHour}
                        onChange={(e) => setNightStartHour(Number(e.target.value))}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs uppercase text-[#E5E3D8]/70 mb-1.5">
                        Day Hourly Rate (INR — blank to confirm via WhatsApp)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={dayRate}
                        onChange={(e) => setDayRate(e.target.value)}
                        placeholder="Leave blank if unconfigured"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular"
                      />
                    </div>
                    <div>
                      <label className="block text-xs uppercase text-[#E5E3D8]/70 mb-1.5">
                        Floodlight Hourly Rate (INR)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={nightRate}
                        onChange={(e) => setNightRate(e.target.value)}
                        placeholder="Leave blank if unconfigured"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-[#E5E3D8]/70 mb-1.5">
                      Venue Announcement Banner (Optional)
                    </label>
                    <input
                      type="text"
                      maxLength={240}
                      value={announcement}
                      onChange={(e) => setAnnouncement(e.target.value)}
                      placeholder="e.g. Tournament schedule or holiday hours"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-[#070908] border border-white/15 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs uppercase text-[#E5E3D8]/70 mb-1.5">
                      Verified Venue Notes / Amenities
                    </label>
                    <div className="flex gap-2 mb-2">
                      <input
                        type="text"
                        maxLength={80}
                        value={newFacility}
                        onChange={(e) => setNewFacility(e.target.value)}
                        placeholder="Add verified amenity note"
                        className="flex-1 px-3.5 py-2 rounded-xl bg-[#070908] border border-white/15 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const v = newFacility.trim();
                          if (v && facilities.length < 12) {
                            setFacilities([...facilities, v]);
                            setNewFacility('');
                          }
                        }}
                        className="px-4 py-2 rounded-xl bg-white/10 text-xs font-semibold hover:bg-white/15 inline-flex items-center gap-1"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add</span>
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {facilities.map((f, i) => (
                        <div
                          key={i}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#070908] border border-white/15 text-xs"
                        >
                          <span>{f}</span>
                          <button
                            type="button"
                            onClick={() => setFacilities(facilities.filter((_, idx) => idx !== i))}
                            aria-label={`Remove ${f}`}
                            className="text-red-400 hover:text-red-300"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {settingsNotice && (
                    <p className="text-xs text-[#F6E27A]">{settingsNotice}</p>
                  )}

                  <button
                    type="submit"
                    className="px-6 py-3 rounded-xl bg-gold-metallic text-[#070908] font-bold text-xs uppercase tracking-wider hover:brightness-110"
                  >
                    Save Venue Configuration
                  </button>
                </form>
              )}

              {/* TAB 3: Manual Slot Blocking */}
              {activeTab === 'availability' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <label className="text-xs uppercase text-[#D4AF37] font-semibold">
                      Manage Date:
                    </label>
                    <input
                      type="date"
                      value={availDate}
                      onChange={(e) => e.target.value && setAvailDate(e.target.value)}
                      className="px-3.5 py-2 rounded-xl bg-[#070908] border border-white/15 text-sm font-mono-tabular"
                    />
                  </div>
                  <p className="text-xs text-[#E5E3D8]/65">
                    Click any open hour to block it for maintenance or offline reservations, or click
                    a blocked slot to reopen it. Customer-booked slots are released from the Bookings
                    tab.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2.5">
                    {Array.from(
                      { length: Math.max(0, closeHour - openHour) },
                      (_, i) => openHour + i
                    ).map((hour) => {
                      const lock = dateLocks[hour];
                      const isBooked = lock?.status === 'booked';
                      const isBlocked = lock?.status === 'blocked';
                      return (
                        <button
                          key={hour}
                          type="button"
                          disabled={isBooked}
                          onClick={() => toggleManualBlock(hour)}
                          className={`p-3 rounded-xl border text-left transition-colors ${
                            isBooked
                              ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200 cursor-not-allowed'
                              : isBlocked
                                ? 'bg-red-950/50 border-red-500/40 text-red-200 hover:bg-red-900/50'
                                : 'bg-[#070908] border-white/15 text-[#F4F2EA] hover:border-[#D4AF37]'
                          }`}
                        >
                          <div className="font-mono-tabular text-xs font-semibold">
                            {formatHour(hour)}
                          </div>
                          <div className="mt-1 flex items-center justify-between text-[11px]">
                            <span>
                              {isBooked ? 'Booked' : isBlocked ? 'Blocked' : 'Available'}
                            </span>
                            {isBlocked ? (
                              <Lock className="w-3 h-3" />
                            ) : !isBooked ? (
                              <Unlock className="w-3 h-3 opacity-60" />
                            ) : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
