/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { Menu, X, ArrowRight } from "lucide-react";
import { LOGO_MAIN } from "../data";

interface NavbarProps {
  onScrollToContact: () => void;
  onScrollToCompetencies: () => void;
  onScrollToHero: () => void;
  onOpenVault: () => void;
  inquiryCount: number;
}

export default function Navbar({
  onScrollToContact,
  onScrollToCompetencies,
  onScrollToHero,
  onOpenVault,
  inquiryCount,
}: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 30) {
        setScrolled(true);
      } else {
        setScrolled(false);
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <nav
      id="main-navbar"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-500 font-sans ${
        scrolled
          ? "bg-brand-surface-dim/80 backdrop-blur-xl border-b border-white/10 py-4 shadow-[0_4px_30px_rgba(0,17,54,0.4)]"
          : "bg-transparent py-6"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 md:px-12 flex justify-between items-center">
        {/* Brand Logo Link */}
        <button
          onClick={onScrollToHero}
          id="navbar-logo-btn"
          className="flex items-center gap-3.5 group cursor-pointer text-left focus:outline-none"
        >
          <img
            src={LOGO_MAIN}
            alt="Core Solution Logo"
            className="h-10 w-10 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="font-sans font-bold text-xl md:text-2xl text-on-surface tracking-tight group-hover:text-white transition-colors">
            Core Solution
          </span>
        </button>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center md:gap-4 lg:gap-8">
          <button
            onClick={onScrollToHero}
            id="nav-link-home"
            className="text-on-surface-variant hover:text-brand-tertiary transition-all duration-300 font-medium text-sm focus:outline-none cursor-pointer"
          >
            Home
          </button>
          <button
            onClick={onScrollToCompetencies}
            id="nav-link-competencies"
            className="text-on-surface-variant hover:text-brand-tertiary transition-all duration-300 font-medium text-sm focus:outline-none cursor-pointer"
          >
            Competencies
          </button>
          <button
            onClick={onScrollToContact}
            id="nav-link-consultation"
            className="text-on-surface-variant hover:text-brand-tertiary transition-all duration-300 font-medium text-sm focus:outline-none cursor-pointer"
          >
            Consultation
          </button>
        </div>

        {/* Actions Button */}
        <div className="hidden md:block">
          <button
            onClick={onScrollToContact}
            id="navbar-cta-btn"
            className="relative overflow-hidden group rounded-lg md:px-3.5 md:py-2 md:text-xs lg:px-5 lg:py-2.5 lg:text-sm font-semibold transition-all duration-300 bg-gradient-to-r from-brand-tertiary to-brand-secondary text-brand-on-primary hover:scale-105 active:scale-95 shadow-[0_0_15px_rgba(0,217,255,0.2)] hover:shadow-[0_0_25px_rgba(0,217,255,0.4)] cursor-pointer"
          >
            <span className="relative z-10 flex items-center md:gap-1 lg:gap-1.5 font-sans">
              Book Consultation <ArrowRight className="h-3.5 w-3.5 md:h-3 md:w-3 lg:h-4 lg:w-4 transition-transform group-hover:translate-x-1" />
            </span>
          </button>
        </div>

        {/* Mobile Hamburguer */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={() => setIsOpen(!isOpen)}
            id="mobile-nav-toggle"
            className="text-on-surface hover:text-brand-tertiary p-1.5 border border-white/10 rounded-lg bg-white/5 focus:outline-none cursor-pointer"
            aria-label="Toggle menu"
          >
            {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div
          id="mobile-menu-drawer"
          className="md:hidden absolute top-full left-0 w-full bg-brand-surface/95 backdrop-blur-2xl border-b border-white/10 py-6 px-8 flex flex-col gap-5 shadow-[0_8px_32px_rgba(0,0,0,0.5)] animate-fade-in"
        >
          <button
            onClick={() => {
              setIsOpen(false);
              onScrollToHero();
            }}
            id="mobile-link-home"
            className="text-left py-2 text-on-surface hover:text-brand-tertiary border-b border-white/5 font-medium transition-colors"
          >
            Home
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onScrollToCompetencies();
            }}
            id="mobile-link-competencies"
            className="text-left py-2 text-on-surface hover:text-brand-tertiary border-b border-white/5 font-medium transition-colors"
          >
            Competencies
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              onScrollToContact();
            }}
            id="mobile-link-consultation"
            className="text-left py-2 text-on-surface hover:text-brand-tertiary border-b border-white/5 font-medium transition-colors"
          >
            Consultation
          </button>

          <button
            onClick={() => {
              setIsOpen(false);
              onScrollToContact();
            }}
            id="mobile-cta-btn"
            className="w-full text-center rounded-lg py-3 font-semibold bg-gradient-to-r from-brand-tertiary to-brand-secondary text-brand-on-primary shadow-lg mt-2 cursor-pointer"
          >
            Book Free AI Consultation
          </button>
        </div>
      )}
    </nav>
  );
}
