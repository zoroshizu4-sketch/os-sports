import aerialGoldenHourImg from '../assets/images/turf_aerial_golden_hour_1794657585343.jpg';
import nightFloodlightsImg from '../assets/images/turf_night_floodlights_1794657586581.jpg';
import pitchCloseupImg from '../assets/images/turf_pitch_closeup_1794657587991.jpg';
import goalpostBoundaryImg from '../assets/images/turf_goalpost_boundary_1794657587604.jpg';

export type LightingMode = 'day' | 'sunset' | 'night';
export type PlayerAction = 'auto' | 'dribble' | 'shoot' | 'dive' | 'celebrate';
export type CameraPreset = 'broadcast' | 'drone' | 'ball';

export interface VenueSettings {
  openHour: number;
  closeHour: number;
  nightStartHour: number;
  dayRatePerHour: number | null;
  nightRatePerHour: number | null;
  currency: string;
  customFacilities: string[];
  announcement: string;
  updatedAt?: unknown;
}

export const DEFAULT_VENUE_SETTINGS: VenueSettings = {
  openHour: 5,
  closeHour: 23,
  nightStartHour: 18,
  dayRatePerHour: null,
  nightRatePerHour: null,
  currency: 'INR',
  customFacilities: [],
  announcement: '',
};

export interface SlotLock {
  id: string;
  date: string;
  hour: number;
  status: 'booked' | 'blocked';
  bookingId: string;
  createdAt?: unknown;
}

export interface BookingRecord {
  id: string;
  bookingRef: string;
  date: string;
  startHour: number;
  durationHours: number;
  customerName: string;
  customerPhone: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'cancelled';
  quotedTotal: number | null;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface GalleryPhoto {
  id: string;
  src: string;
  title: string;
  category: 'floodlights' | 'pitch' | 'aerial';
  caption: string;
  aspect: '16:9' | '4:3';
}

export const TURF_GALLERY_PHOTOS: GalleryPhoto[] = [
  {
    id: 'aerial-golden-hour',
    src: aerialGoldenHourImg,
    title: 'Open-Air Aerial Pitch View',
    category: 'aerial',
    caption: 'Full open-sky artificial green pitch surrounded by tall perimeter boundary nets and corner floodlight towers.',
    aspect: '16:9',
  },
  {
    id: 'night-floodlights',
    src: nightFloodlightsImg,
    title: 'Floodlit Night Session',
    category: 'floodlights',
    caption: 'Outdoor LED floodlight towers illuminating crisp touchlines, goalposts, and green turf under open night sky.',
    aspect: '16:9',
  },
  {
    id: 'pitch-closeup',
    src: pitchCloseupImg,
    title: 'Match Turf & Touchline Surface',
    category: 'pitch',
    caption: 'Lush green football turf blades paired with crisp white markings, goalpost netting, and open sky.',
    aspect: '4:3',
  },
  {
    id: 'goalpost-boundary',
    src: goalpostBoundaryImg,
    title: 'Goalpost & Boundary Netting',
    category: 'pitch',
    caption: 'Regulation white goalposts backed by high-tension black perimeter safety boundary nets.',
    aspect: '4:3',
  },
];

export const VENUE_PHONE_LOCAL = '1234567898';
export const VENUE_PHONE_INTL = '+911234567898';
export const VENUE_WHATSAPP_DIGITS = '911234567898';
export const ADMIN_EMAIL = 'zoroshizu4@gmail.com';
export const METTUPALAYAM_COORDS = { lat: 11.2995, lng: 76.9351 };
