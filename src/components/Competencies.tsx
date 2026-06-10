/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { motion } from "motion/react";
import { BrainCircuit, Compass, Network, Cpu, Layers, HelpCircle } from "lucide-react";
import { COMPETENCIES } from "../data";
import { Competency } from "../types";

const getIcon = (name: string, className: string) => {
  switch (name) {
    case "BrainCircuit":
      return <BrainCircuit className={className} />;
    case "Compass":
      return <Compass className={className} />;
    case "Network":
      return <Network className={className} />;
    case "Cpu":
      return <Cpu className={className} />;
    case "Layers":
      return <Layers className={className} />;
    default:
      return <HelpCircle className={className} />;
  }
};

const getColorClasses = (theme: "tertiary" | "secondary" | "primary") => {
  switch (theme) {
    case "tertiary":
      return {
        text: "text-brand-tertiary",
        glow: "bg-brand-tertiary/10 group-hover:bg-brand-tertiary/20",
        border: "group-hover:border-brand-tertiary/40",
      };
    case "secondary":
      return {
        text: "text-brand-secondary",
        glow: "bg-brand-secondary/10 group-hover:bg-brand-secondary/20",
        border: "group-hover:border-brand-secondary/40",
      };
    case "primary":
      return {
        text: "text-brand-primary",
        glow: "bg-brand-primary/10 group-hover:bg-brand-primary/20",
        border: "group-hover:border-brand-primary/40",
      };
  }
};

interface CompetenciesProps {
  idRef: React.RefObject<HTMLDivElement | null>;
}

export default function Competencies({ idRef }: CompetenciesProps) {
  return (
    <section
      ref={idRef}
      id="competencies-section"
      className="max-w-7xl mx-auto px-6 md:px-12 py-24 relative z-10 font-sans"
    >
      <div className="text-center flex flex-col items-center gap-4 mb-20">
        <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white font-sans">
          Core Competencies
        </h2>
        <p className="text-on-surface-variant text-base md:text-lg max-w-2xl leading-relaxed font-sans">
          Architecting intelligence for the modern enterprise. We provide end-to-end solutions that
          turn complex operational challenges into reliable, automated advantages.
        </p>
        <div className="w-24 h-1 bg-gradient-to-r from-brand-tertiary to-brand-secondary rounded-full mt-2"></div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 relative z-10">
        {COMPETENCIES.map((competency, idx) => {
          const colors = getColorClasses(competency.colorTheme);

          // Customize grid spans to match the bento layout layout of Stitch:
          // Row 1: 3 cards of equal size (spans 4 each on 12-col)
          // Row 2: 2 cards of equal size (spans 6 each, wait - Stitch has Workflow Automation and AI Business Redesign taking 5 columns each, offset-2?
          // Let's make it look pristine on desktop:
          // Standard: grid-cols-1 on mobile. md:col-span-4 for cards 1-3.
          // Cards 4-5 can span 6 columns each to form a balanced bento, or span 5 with an offset.
          // Spanning 6 columns each on md screens provides a highly professional, symmetric bottom row.
          const isRowTwo = idx >= 3;
          const colSpanClass = isRowTwo ? "md:col-span-6" : "md:col-span-4";

          return (
            <motion.div
              key={competency.id}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: idx * 0.1 }}
              className={`${colSpanClass} glass-card p-8 flex flex-col items-start text-left group rounded-2xl relative overflow-hidden`}
            >
              {/* Radial theme glow element */}
              <div
                className={`absolute -bottom-10 -right-10 w-36 h-36 blur-[40px] rounded-full transition-colors duration-500 pointer-events-none -z-10 ${colors.glow}`}
              ></div>

              {/* Decorative line grid overlay for card */}
              <div className="absolute inset-0 bg-white/[0.01] pointer-events-none -z-20"></div>

              {/* Icon */}
              <div className="p-3.5 bg-white/5 border border-white/10 rounded-xl mb-6 shadow-inner transition-transform duration-500 group-hover:scale-110 group-hover:border-white/20">
                {getIcon(competency.iconName, `h-7 w-7 ${colors.text}`)}
              </div>

              {/* Title */}
              <h3 className="text-xl md:text-2xl font-bold text-white mb-3 tracking-tight font-sans">
                {competency.title}
              </h3>

              {/* Description */}
              <p className="text-on-surface-variant text-sm md:text-base leading-relaxed font-sans">
                {competency.description}
              </p>

              {/* Bottom decorative highlight */}
              <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-tertiary/20 to-transparent scale-x-0 group-hover:scale-x-100 transition-transform duration-500"></div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}
