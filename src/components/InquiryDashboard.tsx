/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { X, Trash2, Calendar, Mail, FileText, Building, Database, ArrowUpRight, BadgeHelp } from "lucide-react";
import { Inquiry } from "../types";

interface InquiryDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  inquiries: Inquiry[];
  onDeleteInquiry: (id: string) => void;
}

export default function InquiryDashboard({
  isOpen,
  onClose,
  inquiries,
  onDeleteInquiry,
}: InquiryDashboardProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Overlay mask */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.6 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-brand-surface-dim z-50 backdrop-blur-sm cursor-pointer"
          ></motion.div>

          {/* Slide-out drawer panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 180 }}
            className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-brand-surface-dim/95 border-l border-white/10 z-50 flex flex-col font-sans shadow-[0_0_50px_rgba(3,43,110,0.5)]"
          >
            {/* Header section with glass header */}
            <div className="flex justify-between items-center px-6 py-6 border-b border-white/10 bg-brand-surface-bright/20 backdrop-blur-md">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-lg bg-brand-tertiary/10 border border-brand-tertiary/20 text-brand-tertiary">
                  <Database className="h-5 w-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-lg text-white">Inquiry Vault</h3>
                  <p className="font-mono text-xxs text-brand-tertiary uppercase tracking-wider">
                    Secure On-Device Dossiers
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 rounded-lg border border-white/10 hover:border-brand-tertiary/40 text-on-surface hover:text-white transition-all cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Dynamic records pane body */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-5">
              {inquiries.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-center gap-4 py-20 px-8">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-full text-on-surface-variant/40 shadow-inner">
                    <BadgeHelp className="h-10 w-10" />
                  </div>
                  <div>
                    <p className="text-white font-bold text-base">Vault is Empty</p>
                    <p className="text-on-surface-variant text-xs mt-1 max-w-xs mx-auto">
                      Submit a consultation reservation form on the front page to populate real-time
                      secure dossiers.
                    </p>
                  </div>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {inquiries.map((inquiry) => (
                    <motion.div
                      key={inquiry.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, x: 100 }}
                      className="rounded-xl border border-white/10 bg-white/[0.02] p-5 relative overflow-hidden group shadow-md"
                    >
                      {/* Interactive dossier card body layout */}
                      <div className="flex justify-between items-start gap-3">
                        <div className="flex flex-col gap-2 flex-1">
                          {/* Name info */}
                          <div className="flex items-center gap-2">
                            <span className="font-sans font-bold text-white text-base">
                              {inquiry.fullName}
                            </span>
                            <span className="px-2 py-0.5 rounded-full bg-brand-tertiary/10 border border-brand-tertiary/20 text-brand-tertiary font-mono text-[9px] font-bold uppercase tracking-wider">
                              Verified
                            </span>
                          </div>

                          {/* Company Name */}
                          <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                            <Building className="h-3.5 w-3.5 text-brand-secondary" />
                            <span>{inquiry.companyName}</span>
                          </div>

                          {/* Email Address */}
                          <div className="flex items-center gap-2 text-on-surface-variant text-xs">
                            <Mail className="h-3.5 w-3.5 text-brand-primary" />
                            <a
                              href={`mailto:${inquiry.businessEmail}`}
                              className="hover:text-brand-tertiary transition-colors"
                            >
                              {inquiry.businessEmail}
                            </a>
                          </div>
                        </div>

                        {/* Actions delete button */}
                        <button
                          onClick={() => onDeleteInquiry(inquiry.id)}
                          className="p-2 border border-red-500/10 hover:border-red-500/30 text-on-surface hover:text-red-400 bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-all cursor-pointer"
                          title="Purge record"
                        >
                          <Trash2 className="h-4.5 w-4.5" />
                        </button>
                      </div>

                      {/* Msg */}
                      <div className="mt-4 p-3 rounded-lg bg-black/20 border border-white/5 text-on-surface text-xs leading-relaxed font-sans relative">
                        <FileText className="absolute top-3 right-3 h-3.5 w-3.5 text-on-surface-variant/30" />
                        <p className="whitespace-pre-line pr-6">{inquiry.message}</p>
                      </div>

                      {/* Footer time tags */}
                      <div className="flex justify-between items-center mt-4 pt-3 border-t border-white/5 text-[10px] font-mono text-on-surface-variant/60">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          <span>{inquiry.submittedAt}</span>
                        </div>
                        <div className="flex items-center gap-1 uppercase tracking-wider text-brand-tertiary">
                          <span>Aether Sec-Ops</span>
                          <ArrowUpRight className="h-2.5 w-2.5" />
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>

            {/* Bottom aggregate panel stats summary */}
            {inquiries.length > 0 && (
              <div className="p-6 border-t border-white/5 bg-brand-surface-dim flex items-center justify-between text-xs font-mono text-on-surface-variant/80">
                <span>Total Dossiers: {inquiries.length}</span>
                <span className="text-xxs uppercase text-brand-secondary tracking-wider">
                  AES-256 On-Device Enclave
                </span>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
