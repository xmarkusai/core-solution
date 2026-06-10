/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LOGO_FOOTER } from "../data";
import { ArrowUp, Github } from "lucide-react";

interface FooterProps {
  onScrollToHero: () => void;
  onScrollToCompetencies: () => void;
  onScrollToContact: () => void;
  onOpenVault: () => void;
}

export default function Footer({
  onScrollToHero,
  onScrollToCompetencies,
  onScrollToContact,
  onOpenVault,
}: FooterProps) {
  return (
    <footer className="relative bg-brand-surface-dim/95 backdrop-blur-md py-16 md:py-24 border-t border-white/10 z-20 overflow-hidden font-sans">
      {/* Decorative gradient light line */}
      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-brand-tertiary/40 to-transparent"></div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10 flex flex-col md:flex-row justify-between items-center gap-10">
        {/* Brand identity */}
        <button
          onClick={onScrollToHero}
          className="flex items-center gap-3.5 group text-left focus:outline-none cursor-pointer"
        >
          <img
            src={LOGO_FOOTER}
            alt="Core Solution Logo"
            className="h-9 w-9 object-contain"
            referrerPolicy="no-referrer"
          />
          <span className="font-sans font-bold text-xl text-white tracking-tight group-hover:text-brand-tertiary transition-colors">
            Core Solution
          </span>
        </button>



        {/* Copyrights & top-scroll combo */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-center md:text-right">
          <span className="text-on-surface-variant/70 text-xs font-mono">
            &copy; 2026 Core Solution. All rights reserved.
          </span>

          <button
            onClick={onScrollToHero}
            className="p-2.5 rounded-lg border border-white/10 hover:border-brand-tertiary/40 bg-white/5 hover:bg-white/10 text-on-surface hover:text-white transition-all cursor-pointer"
            aria-label="Scroll to top"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        </div>
      </div>
    </footer>
  );
}
