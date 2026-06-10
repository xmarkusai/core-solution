/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useState, useEffect } from "react";
import Navbar from "./components/Navbar";
import Hero from "./components/Hero";
import Competencies from "./components/Competencies";
import ContactSession from "./components/ContactSession";
import InquiryDashboard from "./components/InquiryDashboard";
import Footer from "./components/Footer";
import { Inquiry } from "./types";
import { Sparkles, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import AdminPortal from "./components/AdminPortal";

export default function App() {
  if (typeof window !== "undefined" && window.location.pathname === "/coreadmin-crm") {
    return <AdminPortal />;
  }

  const heroRef = useRef<HTMLDivElement>(null);
  const competenciesRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const [inquiries, setInquiries] = useState<Inquiry[]>(() => {
    try {
      const saved = localStorage.getItem("core-solution-inquiries");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [showSubToast, setShowSubToast] = useState(false);
  const [lastSubName, setLastSubName] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem("core-solution-inquiries", JSON.stringify(inquiries));
    } catch (e) {
      console.error("Local storage sync error", e);
    }
  }, [inquiries]);

  const handleScrollToRef = (ref: React.RefObject<HTMLDivElement | null>) => {
    if (ref && ref.current) {
      ref.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  const handleInquirySubmitted = (newInquiry: Inquiry) => {
    setInquiries((prev) => [newInquiry, ...prev]);
    setLastSubName(newInquiry.fullName);
    setShowSubToast(true);

    // Automatically hide secondary header notification banner after 6 seconds
    setTimeout(() => {
      setShowSubToast(false);
    }, 6000);
  };

  const handleDeleteInquiry = (id: string) => {
    setInquiries((prev) => prev.filter((item) => item.id !== id));
  };

  return (
    <div className="bg-brand-surface min-h-screen text-on-surface relative select-none selection:bg-brand-tertiary/30 selection:text-white">
      {/* Dynamic Header sliding notification toast on submission */}
      <AnimatePresence>
        {showSubToast && (
          <motion.div
            initial={{ opacity: 0, y: -80 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -80 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 z-55 w-full max-w-sm px-4"
          >
            <div className="bg-brand-surface-dim/95 backdrop-blur-xl border border-brand-secondary/40 shadow-[0_0_20px_rgba(211,255,154,0.15)] rounded-xl p-4 flex items-start gap-3">
              <div className="p-1.5 bg-brand-secondary/15 rounded-lg text-brand-secondary">
                <CheckCircle className="h-5 w-5 animate-bounce" />
              </div>
              <div className="flex-1">
                <h4 className="font-bold text-xs text-white">Consulation Queued</h4>
                <p className="text-on-surface-variant text-xxs mt-0.5 leading-relaxed">
                  Dossier synthesized for <strong className="text-white">{lastSubName}</strong>. 
                  View this entry in the secure on-device Vault database registry in the menu links.
                </p>
              </div>
              <button
                onClick={() => setShowSubToast(false)}
                className="text-on-surface-variant hover:text-white text-xs font-bold leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating dynamic glass navigation bars */}
      <Navbar
        onScrollToHero={() => handleScrollToRef(heroRef)}
        onScrollToCompetencies={() => handleScrollToRef(competenciesRef)}
        onScrollToContact={() => handleScrollToRef(contactRef)}
        onOpenVault={() => setIsVaultOpen(true)}
        inquiryCount={inquiries.length}
      />

      {/* Hero Header component with scroll states inside ref grids */}
      <div ref={heroRef}>
        <Hero
          onScrollToContact={() => handleScrollToRef(contactRef)}
          onScrollToCompetencies={() => handleScrollToRef(competenciesRef)}
        />
      </div>

      {/* Competencies bento grids */}
      <Competencies idRef={competenciesRef} />

      {/* Interactive schedules and intake form segments */}
      <ContactSession
        idRef={contactRef}
        onInquirySubmitted={handleInquirySubmitted}
      />

      {/* Sliding administrative dossier database vaults */}
      <InquiryDashboard
        isOpen={isVaultOpen}
        onClose={() => setIsVaultOpen(false)}
        inquiries={inquiries}
        onDeleteInquiry={handleDeleteInquiry}
      />

      {/* Footer segments compatible with Original Stitch designs */}
      <Footer
        onScrollToHero={() => handleScrollToRef(heroRef)}
        onScrollToCompetencies={() => handleScrollToRef(competenciesRef)}
        onScrollToContact={() => handleScrollToRef(contactRef)}
        onOpenVault={() => setIsVaultOpen(true)}
      />
    </div>
  );
}
