/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Check, ClipboardList, Send, Loader2, Sparkles, Building, Mail, MessageSquare, AlertCircle, Phone } from "lucide-react";
import { TESTIMONIAL_QUOTE } from "../data";
import { Inquiry } from "../types";

const CHECKLIST_ITEMS = [
  "Free 30-Minute AI Strategy Session",
  "Personalized AI Recommendations",
  "Identify Cost-Saving Opportunities",
  "Discover Automation Opportunities",
  "Practical AI Roadmap For Your Business",
  "No Obligation Required",
];

interface ContactSessionProps {
  idRef: React.RefObject<HTMLDivElement | null>;
  onInquirySubmitted: (inquiry: Inquiry) => void;
}

export default function ContactSession({ idRef, onInquirySubmitted }: ContactSessionProps) {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState(""); // ADDED PHONE STATE
  const [message, setMessage] = useState("");
  const [phoneHoneypot, setPhoneHoneypot] = useState("");

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [hasStartedTracked, setHasStartedTracked] = useState(false);

  // Track Form Views
  React.useEffect(() => {
    fetch("/api/analytics/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event: "form_view" }),
    }).catch((e) => console.warn("Analytics track view failed", e));
  }, []);

  const handleStartTyping = () => {
    if (!hasStartedTracked) {
      setHasStartedTracked(true);
      fetch("/api/analytics/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event: "form_start" }),
      }).catch((e) => console.warn("Analytics track start failed", e));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim()) {
      setErrorMsg("Full Name is required.");
      return;
    }
    if (!companyName.trim()) {
      setErrorMsg("Company Name is required.");
      return;
    }
    if (!businessEmail.trim()) {
      setErrorMsg("Business Email is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(businessEmail)) {
      setErrorMsg("Please enter a valid business email address.");
      return;
    }
    // ADDED PHONE VALIDATION
    if (!phoneNumber.trim()) {
      setErrorMsg("Phone Number is required.");
      return;
    }
    if (!message.trim()) {
      setErrorMsg("Please provide a short description of your goal or message.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/leads/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          fullName: fullName.trim(),
          companyName: companyName.trim(),
          businessEmail: businessEmail.trim(),
          phoneNumber: phoneNumber.trim(), // ADDED PHONE PAYLOAD
          message: message.trim(),
          sourcePage: window.location.pathname,
          phone_honeypot: phoneHoneypot,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "An error occurred while submitting the dossier.");
      }

      // Add to inquiry catalog
      const newInquiry: Inquiry = {
        id: data.leadId || `inq-${Date.now()}`,
        fullName: fullName.trim(),
        companyName: companyName.trim(),
        businessEmail: businessEmail.trim(),
        message: message.trim(),
        submittedAt: new Date().toLocaleString(),
      };

      onInquirySubmitted(newInquiry);

      // Reset values
      setFullName("");
      setCompanyName("");
      setBusinessEmail("");
      setPhoneNumber(""); // RESET PHONE STATE
      setMessage("");
      setPhoneHoneypot("");
      setLoading(false);
      setSuccess(true);

      // Dismiss positive state after 5 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 6000);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to establish secure connection with security server. Try again.");
      setLoading(false);
    }
  };

  return (
    <section
      ref={idRef}
      id="consultation-section"
      className="relative py-28 md:py-36 overflow-hidden font-sans border-t border-white/5"
    >
      {/* Background visual graphics */}
      <div className="absolute inset-0 z-0">
        <div className="absolute bottom-0 right-0 w-[550px] h-[550px] ambient-glow-2 blur-[120px] rounded-full opacity-35 pointer-events-none"></div>
        <div className="absolute top-[20%] left-[10%] w-[350px] h-[350px] ambient-glow-1 blur-[100px] rounded-full opacity-20 pointer-events-none"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 md:px-12 relative z-10">
        {/* Banner Headers */}
        <div className="text-center mb-20 flex flex-col items-center gap-4">
          <motion.h2
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white font-sans max-w-4xl leading-tight"
          >
            Ready To Transform Your
            <br />
            Business With AI?
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-on-surface-variant text-base md:text-lg max-w-3xl leading-relaxed mt-2"
          >
            Book a complimentary AI Strategy Session and discover practical ways to reduce costs,
            automate workflows, improve productivity, and accelerate business growth.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-start mt-8">
          {/* Left: Why Choose Section & Quotes */}
          <div className="lg:col-span-6 flex flex-col gap-8 justify-center min-h-full">
            <h3 className="text-2xl md:text-3xl font-bold text-white tracking-tight font-sans flex items-center gap-2">
              <ClipboardList className="h-6 w-6 text-brand-tertiary" />
              Why Speak With Core Solution?
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {CHECKLIST_ITEMS.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 shadow-inner"
                >
                  <div className="mt-1 p-0.5 bg-brand-tertiary/10 border border-brand-tertiary/20 rounded-full text-brand-tertiary flex items-center justify-center">
                    <Check className="h-4.5 w-4.5" />
                  </div>
                  <span className="text-on-surface-variant text-sm md:text-base font-sans font-medium">
                    {item}
                  </span>
                </div>
              ))}
            </div>

            {/* Testimonial Quote Panel */}
            <div className="mt-4 p-6 md:p-8 rounded-2xl glass-card border-brand-tertiary/10 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-brand-tertiary/10 select-none text-7xl font-serif">
                “
              </div>
              <p className="text-on-surface italic text-base md:text-lg leading-relaxed relative z-10">
                "{TESTIMONIAL_QUOTE}"
              </p>
              <div className="flex items-center gap-3 mt-4">
                <div className="w-8 h-[2px] bg-brand-tertiary"></div>
                <span className="text-xs font-mono tracking-widest text-brand-tertiary uppercase">
                  AI Strategy Advisory
                </span>
              </div>
            </div>
          </div>

          {/* Right: Glassmorphism intake form panel */}
          <div className="lg:col-span-6">
            <div className="glass-card p-6 md:p-10 rounded-2xl md:rounded-[2rem] border-white/10 relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 left-0 w-32 h-32 bg-brand-tertiary/5 blur-[50px] -z-10 rounded-full"></div>

              <div className="mb-6">
                <h4 className="text-xl md:text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <Sparkles className="h-5.5 w-5.5 text-brand-tertiary" />
                  Complimentary Intake
                </h4>
                <p className="text-on-surface-variant text-xs mt-1">
                  Connect instantly with our executive-grade systems team.
                </p>
              </div>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                {/* Full name input */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs font-bold tracking-wider text-brand-tertiary uppercase">
                    Full Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => { setFullName(e.target.value); handleStartTyping(); }}
                      placeholder="John Doe"
                      disabled={loading || success}
                      className="w-full glass-input rounded-xl px-4 py-3.5 pl-11 text-white text-sm focus:outline-none placeholder-on-surface-variant/40"
                    />
                    <Check className="absolute top-1/2 left-4 -translate-y-1/2 h-4.5 w-4.5 text-on-surface-variant/50" />
                  </div>
                </div>

                {/* Honeypot field for anti-spam protection (Invisible to humans) */}
                <input
                  type="text"
                  name="phone_honeypot"
                  value={phoneHoneypot}
                  onChange={(e) => setPhoneHoneypot(e.target.value)}
                  tabIndex={-1}
                  autoComplete="off"
                  className="absolute w-0 h-0 opacity-0 pointer-events-none"
                />

                {/* Company name input */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs font-bold tracking-wider text-brand-secondary uppercase">
                    Company Name
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => { setCompanyName(e.target.value); handleStartTyping(); }}
                      placeholder="Acme Corp"
                      disabled={loading || success}
                      className="w-full glass-input rounded-xl px-4 py-3.5 pl-11 text-white text-sm focus:outline-none placeholder-on-surface-variant/40"
                    />
                    <Building className="absolute top-1/2 left-4 -translate-y-1/2 h-4.5 w-4.5 text-on-surface-variant/50" />
                  </div>
                </div>

                {/* Business email input */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs font-bold tracking-wider text-brand-primary uppercase">
                    Business Email
                  </label>
                  <div className="relative">
                    <input
                      type="type" // Intentionally left as 'type' per original code
                      value={businessEmail}
                      onChange={(e) => { setBusinessEmail(e.target.value); handleStartTyping(); }}
                      placeholder="john@acme.com"
                      disabled={loading || success}
                      className="w-full glass-input rounded-xl px-4 py-3.5 pl-11 text-white text-sm focus:outline-none placeholder-on-surface-variant/40"
                    />
                    <Mail className="absolute top-1/2 left-4 -translate-y-1/2 h-4.5 w-4.5 text-on-surface-variant/50" />
                  </div>
                </div>

                {/* NEW: Phone number input */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs font-bold tracking-wider text-brand-tertiary uppercase">
                    Phone Number
                  </label>
                  <div className="relative">
                    <input
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => { setPhoneNumber(e.target.value); handleStartTyping(); }}
                      placeholder="+60 12-345-6789"
                      disabled={loading || success}
                      className="w-full glass-input rounded-xl px-4 py-3.5 pl-11 text-white text-sm focus:outline-none placeholder-on-surface-variant/40"
                    />
                    <Phone className="absolute top-1/2 left-4 -translate-y-1/2 h-4.5 w-4.5 text-on-surface-variant/50" />
                  </div>
                </div>

                {/* Message text input */}
                <div className="flex flex-col gap-2">
                  <label className="font-mono text-xs font-bold tracking-wider text-on-surface-variant uppercase">
                    Message Summary
                  </label>
                  <div className="relative">
                    <textarea
                      rows={4}
                      value={message}
                      onChange={(e) => { setMessage(e.target.value); handleStartTyping(); }}
                      placeholder="Tell us about your business, current challenges, or goals you'd like to achieve through AI and automation."
                      disabled={loading || success}
                      className="w-full glass-input rounded-xl px-4 py-3.5 pl-11 text-white text-sm focus:outline-none placeholder-on-surface-variant/40"
                    ></textarea>
                    <MessageSquare className="absolute top-4 left-4 h-4.5 w-4.5 text-on-surface-variant/50" />
                  </div>
                </div>

                {/* Alert panel error feedback */}
                <AnimatePresence>
                  {errorMsg && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="flex items-center gap-2 p-3.5 bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-xl"
                    >
                      <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                      <span>{errorMsg}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Submit state checkouts */}
                <AnimatePresence mode="wait">
                  {success ? (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-5 bg-brand-secondary/15 border border-brand-secondary/35 text-brand-secondary rounded-xl text-center flex flex-col items-center gap-1.5"
                    >
                      <Check className="h-8 w-8 text-brand-secondary animate-bounce bg-brand-secondary/10 p-1.5 rounded-full" />
                      <span className="font-bold text-sm">Consultation Reserved!</span>
                      <div className="text-xs text-on-surface-variant max-w-sm mt-1.5 space-y-2 leading-relaxed">
                        <p>Thank you for contacting Core Solution.</p>
                        <p>Your enquiry has been received successfully.</p>
                        <p>A confirmation email has been sent to your inbox.</p>
                        <p>Our team will review your request and contact you shortly.</p>
                      </div>
                    </motion.div>
                  ) : (
                    <button
                      type="submit"
                      disabled={loading}
                      id="consultation-form-submit"
                      className="w-full relative overflow-hidden group rounded-xl py-4 font-semibold text-base flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-brand-tertiary over via-brand-primary to-brand-secondary text-brand-on-primary hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[0_0_20px_rgba(0,217,255,0.4)] cursor-pointer"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Processing Dossier...</span>
                        </>
                      ) : (
                        <>
                          <span>Book Free AI Consultation</span>
                          <Send className="h-4.5 w-4.5 transition-transform group-hover:translate-x-1" />
                        </>
                      )}
                    </button>
                  )}
                </AnimatePresence>

                {/* Bottom footnotes */}
                <div className="flex flex-col gap-1 items-center mt-2 text-center text-xs">
                  <p className="text-brand-tertiary font-bold tracking-wide">
                    Free 30-Minute AI Strategy Session
                  </p>
                  <p className="text-on-surface-variant/60 font-sans leading-relaxed">
                    Typically responds within 24 hours. Your data is protected by our Privacy
                    Policy.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
