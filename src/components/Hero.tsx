/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Sparkles, Star, Zap, Cpu } from "lucide-react";
import { LOGO_MAIN, TEXT_CAROUSEL_ITEMS, PARTNER_LOGOS } from "../data";

interface HeroProps {
  onScrollToContact: () => void;
  onScrollToCompetencies: () => void;
}

export default function Hero({ onScrollToContact, onScrollToCompetencies }: HeroProps) {
  const phrases = [
    "Work Smarter.",
    "Save Costs.",
    "Improve Efficiency.",
    "Scale Operations.",
    "Accelerate Growth.",
  ];

  const [phraseIndex, setPhraseIndex] = useState(0);
  const [displayText, setDisplayText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    const currentPhrase = phrases[phraseIndex];

    if (isDeleting) {
      timer = setTimeout(() => {
        setDisplayText((prev) => prev.slice(0, -1));
      }, 50);
    } else {
      timer = setTimeout(() => {
        setDisplayText((prev) => currentPhrase.slice(0, prev.length + 1));
      }, 100);
    }

    if (!isDeleting && displayText === currentPhrase) {
      timer = setTimeout(() => setIsDeleting(true), 2000);
    } else if (isDeleting && displayText === "") {
      setIsDeleting(false);
      setPhraseIndex((prev) => (prev + 1) % phrases.length);
    }

    return () => clearTimeout(timer);
  }, [displayText, isDeleting, phraseIndex]);

  return (
    <section id="hero-section" className="relative overflow-hidden pt-28 pb-16 md:py-24 font-sans">
      {/* Absolute graphic background grids & ambient radial shines */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-grid-pattern opacity-60"></div>
        <div className="absolute top-[10%] right-[5%] w-[450px] h-[450px] ambient-glow-1 blur-[110px] rounded-full"></div>
        <div className="absolute bottom-[5%] left-[2%] w-[400px] h-[400px] ambient-glow-2 blur-[100px] rounded-full"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center min-h-[75vh]">
          {/* Left Text Detail */}
          <div className="lg:col-span-7 flex flex-col items-start gap-6">
            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="inline-flex items-center gap-2.5 bg-brand-surface-bright/40 backdrop-blur-md rounded-full px-4 py-1.5 border border-brand-tertiary/20 shadow-[0_0_15px_rgba(0,217,255,0.06)]"
            >
              <Cpu className="h-4 w-4 text-brand-tertiary animate-pulse" />
              <span className="font-mono text-xs font-semibold uppercase tracking-wider text-brand-tertiary">
                Enterprise AI Solutions
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.1 }}
              className="text-4xl md:text-5xl lg:text-6xl font-bold font-sans tracking-tight text-white leading-[1.1]"
            >
              AI-Powered Solutions
              <br />
              To Help Businesses
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-tertiary via-brand-primary to-brand-secondary inline-block min-w-[280px] md:min-w-[480px]">
                {displayText}
                <span className="typewriter-cursor">|</span>
              </span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
              className="text-slate-200 text-base md:text-lg max-w-xl leading-relaxed font-sans"
            >
              We help businesses leverage AI, automation, and intelligent systems to reduce costs,
              improve efficiency, and accelerate growth. Transform your operational capacity with
              executive-grade technology.
            </motion.p>

            {/* Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto mt-4"
            >
              <button
                onClick={onScrollToContact}
                id="hero-primary-cta"
                className="group relative overflow-hidden rounded-lg px-8 py-4 text-base font-semibold bg-gradient-to-r from-brand-tertiary to-brand-secondary text-brand-on-primary transition-all duration-300 hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(0,217,255,0.3)] hover:shadow-[0_0_30px_rgba(0,217,255,0.5)] cursor-pointer"
              >
                <span className="relative z-10 flex items-center justify-center gap-2 font-sans">
                  Book Free AI Consultation
                  <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
                </span>
                <span className="absolute inset-0 bg-white/20 transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300"></span>
              </button>

              <button
                onClick={onScrollToCompetencies}
                id="hero-secondary-cta"
                className="rounded-lg px-8 py-4 text-base font-semibold border border-white/15 bg-white/5 hover:bg-white/10 hover:border-brand-tertiary/40 backdrop-blur-sm text-white flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105 active:scale-95 cursor-pointer"
              >
                Explore Solutions
              </button>
            </motion.div>
          </div>

          {/* Right Centerpiece Glass Graphic */}
          <div className="lg:col-span-5 flex justify-center relative mt-8 lg:mt-0">
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, type: "spring", stiffness: 50 }}
              className="relative w-72 h-72 sm:w-96 sm:h-96 flex items-center justify-center"
            >
              {/* Outer decorative orbit animations */}
              <div className="absolute inset-0 border border-brand-tertiary/10 rounded-full animate-[spin_40s_linear_infinite]"></div>
              <div className="absolute inset-4 border border-brand-secondary/10 rounded-full animate-[spin_20s_linear_infinite_reverse]"></div>
              <div className="absolute inset-12 border border-brand-primary/5 rounded-full"></div>

              {/* Holographic blur background */}
              <div className="absolute w-[80%] h-[80%] bg-gradient-to-r from-brand-tertiary/20 to-brand-secondary/20 blur-[80px] rounded-full mix-blend-screen pointer-events-none"></div>

              {/* Main Core static graphic - no scaling or cursor-pointers */}
              <div className="relative z-10">
                <img
                  src={LOGO_MAIN}
                  alt="Aether intelligence core sphere"
                  className="w-64 h-64 sm:w-80 sm:h-80 object-contain drop-shadow-[0_0_50px_rgba(0,217,255,0.4)]"
                  referrerPolicy="no-referrer"
                />
              </div>

              {/* Orbital nodes */}
              <div className="absolute top-[10%] left-[20%] p-1 bg-brand-tertiary rounded-full shadow-[0_0_10px_#00d9ff] animate-bounce"></div>
              <div className="absolute bottom-[15%] right-[10%] p-1.5 bg-brand-secondary rounded-full shadow-[0_0_10px_#d3ff9a] animate-pulse"></div>
            </motion.div>
          </div>
        </div>
      </div>

      {/* INFINITE MARQUEE STRIP "Powered by leading AI technologies" */}
      <div className="mt-20 border-t border-b border-white/5 bg-brand-surface-dim/40 backdrop-blur-md py-16 overflow-hidden relative">
        <div className="max-w-7xl mx-auto px-6 mb-12 text-center relative z-10">
          <h2 className="font-sans text-xs md:text-sm font-semibold tracking-[0.3em] text-white uppercase mb-4">
            Powered By Leading AI Technologies
          </h2>
          <p className="text-slate-400 font-sans text-xs md:text-sm max-w-xl mx-auto leading-relaxed tracking-wide font-normal">
            Architecting trust, innovation, and executive-level integration with the world's most advanced AI systems and platforms.
          </p>
        </div>

        {/* Text Marquee Layer - Smooth Infinite Loop RTL */}
        <div className="relative w-full flex overflow-hidden select-none mb-8 py-2">
          <div className="flex gap-8 items-center animate-[marquee-rtl_55s_linear_infinite] whitespace-nowrap min-w-max">
            {/* Duplicated 3 times to guarantee true seamless continuous infinite loop with no visible gap or jump on any screen size */}
            {[...TEXT_CAROUSEL_ITEMS, ...TEXT_CAROUSEL_ITEMS, ...TEXT_CAROUSEL_ITEMS].map((tag, idx) => (
              <div
                key={`text-tag-${idx}`}
                className="inline-flex items-center gap-2.5 px-5 py-3 rounded-full bg-slate-900/50 backdrop-blur-md border border-white/5 hover:border-brand-tertiary/40 hover:shadow-[0_0_15px_rgba(0,217,255,0.15)] hover:scale-105 transition-all duration-300 cursor-default"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-brand-tertiary shrink-0 animate-pulse"></div>
                <span className="text-xs md:text-sm font-sans tracking-[0.1em] font-medium text-slate-100 uppercase">
                  {tag}
                </span>
              </div>
            ))}
          </div>
          {/* Edge shadow fades to conceal container boundaries */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-brand-surface-dim via-brand-surface-dim/70 to-transparent pointer-events-none z-15"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-brand-surface-dim via-brand-surface-dim/70 to-transparent pointer-events-none z-15"></div>
        </div>

        {/* Brand Logos Marquee Layer - Smooth Infinite Loop LTR */}
        <div className="relative w-full flex overflow-hidden select-none py-2">
          <div className="flex gap-10 items-center animate-[marquee-ltr_75s_linear_infinite] whitespace-nowrap min-w-max">
            {/* Tripled partner logos for perfectly seamless endless wrapping */}
            {[...PARTNER_LOGOS, ...PARTNER_LOGOS, ...PARTNER_LOGOS].map((url, idx) => {
              // Alternate background styling to support primarily light/dark logos with contrast-enhancing backings
              const isDarkBacking = idx % 2 === 0;

              return (
                <div
                  key={`logo-item-${idx}`}
                  className={`relative group/logo flex items-center justify-center w-36 h-16 rounded-xl border transition-all duration-300 hover:scale-105 ${
                    isDarkBacking
                      ? "bg-slate-950/70 border-white/10 hover:border-brand-tertiary/40 hover:shadow-[0_0_20px_rgba(0,217,255,0.15)]"
                      : "bg-white/95 border-slate-200 hover:border-brand-secondary/40 hover:shadow-[0_0_20px_rgba(211,255,154,0.15)]"
                  }`}
                >
                  <img
                    src={url}
                    alt="Partner Technology Brand Logo"
                    className="h-8 max-w-[110px] object-contain relative z-10 transition-transform duration-300 group-hover/logo:scale-105"
                    referrerPolicy="no-referrer"
                  />
                  {/* Subtle inner card glare or background highlight glow */}
                  <div className="absolute inset-0 rounded-xl bg-white/[0.02] pointer-events-none z-0"></div>
                </div>
              );
            })}
          </div>
          {/* Edge shadow fades to conceal container boundaries */}
          <div className="absolute inset-y-0 left-0 w-32 bg-gradient-to-r from-brand-surface-dim via-brand-surface-dim/70 to-transparent pointer-events-none z-15"></div>
          <div className="absolute inset-y-0 right-0 w-32 bg-gradient-to-l from-brand-surface-dim via-brand-surface-dim/70 to-transparent pointer-events-none z-15"></div>
        </div>
      </div>

      <style>{`
        @keyframes marquee-rtl {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-33.33333%, 0, 0); }
        }
        @keyframes marquee-ltr {
          0% { transform: translate3d(-33.33333%, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
      `}</style>
    </section>
  );
}
