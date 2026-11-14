import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';

interface TopBarProps {
  onOpenAdmin: () => void;
  onJumpToBooking: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onOpenAdmin, onJumpToBooking }) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { label: 'Pitch', href: '#pitch' },
    { label: 'Showcase', href: '#showcase' },
    { label: 'Gallery', href: '#gallery' },
    { label: 'Book Slot', href: '#booking' },
    { label: 'Location', href: '#location' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-[#070908]/92 border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single clean wordmark */}
        <a
          href="#pitch"
          className="font-display text-2xl font-extrabold tracking-tight uppercase text-gold-metallic whitespace-nowrap shrink-0"
        >
          OS SPORTS TURF
        </a>

        {/* Zone 2: Concise single-line navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#E5E3D8]/80">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="relative py-1 hover:text-[#F6E27A] transition-colors whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-[1.5px] after:bg-[#D4AF37] hover:after:w-full after:transition-all after:duration-200"
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={onOpenAdmin}
            className="relative py-1 hover:text-[#F6E27A] transition-colors whitespace-nowrap shrink-0 after:content-[''] after:absolute after:left-0 after:bottom-0 after:w-0 after:h-[1.5px] after:bg-[#D4AF37] hover:after:w-full after:transition-all after:duration-200"
          >
            Admin
          </button>
        </nav>

        {/* Zone 3: Single Primary Action + Mobile Menu Trigger */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onJumpToBooking}
            className="hidden sm:inline-flex items-center justify-center px-5 py-2.5 rounded-lg bg-gold-metallic text-[#070908] text-xs font-bold uppercase tracking-wider hover:brightness-110 transition-all whitespace-nowrap shrink-0 min-h-[40px]"
          >
            Book Slot
          </button>
          <button
            type="button"
            onClick={() => setMobileOpen((prev) => !prev)}
            className="md:hidden inline-flex items-center justify-center w-11 h-11 rounded-lg border border-white/15 text-[#F4F2EA] hover:border-[#D4AF37]"
            aria-label={mobileOpen ? 'Close navigation menu' : 'Open navigation menu'}
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileOpen && (
        <div className="md:hidden border-t border-white/10 bg-[#0A0D0B] px-6 py-4 space-y-3">
          {navItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className="block py-2 text-base font-medium text-[#F4F2EA] hover:text-[#F6E27A]"
            >
              {item.label}
            </a>
          ))}
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onOpenAdmin();
            }}
            className="block w-full text-left py-2 text-base font-medium text-[#F4F2EA] hover:text-[#F6E27A]"
          >
            Admin Dashboard
          </button>
          <button
            type="button"
            onClick={() => {
              setMobileOpen(false);
              onJumpToBooking();
            }}
            className="w-full py-3 rounded-lg bg-gold-metallic text-[#070908] text-sm font-bold uppercase tracking-wider"
          >
            Book Slot
          </button>
        </div>
      )}
    </header>
  );
};
