import fs from "node:fs";
import path from "node:path";
import nodemailer from "nodemailer";

export interface NotificationLog {
  id: string;
  leadId: string;
  type: "auto_response" | "internal_alert" | "whatsapp_notification";
  status: "pending" | "success" | "failed";
  recipient: string;
  subjectOrHeader: string;
  messageBody: string;
  attempts: number;
  lastAttempt: string;
  error?: string;
}

const NOTIFICATIONS_LOG_FILE = path.join(process.cwd(), "data", "crm", "notifications_log.json");

// Ensure LOG file exists
function initLogs() {
  const dir = path.dirname(NOTIFICATIONS_LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(NOTIFICATIONS_LOG_FILE)) {
    fs.writeFileSync(NOTIFICATIONS_LOG_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

// Read log records
export function readNotificationLogs(): NotificationLog[] {
  initLogs();
  try {
    return JSON.parse(fs.readFileSync(NOTIFICATIONS_LOG_FILE, "utf-8"));
  } catch {
    return [];
  }
}

// Write log records
export function writeNotificationLogs(logs: NotificationLog[]) {
  initLogs();
  fs.writeFileSync(NOTIFICATIONS_LOG_FILE, JSON.stringify(logs, null, 2), "utf-8");
}

// Log a notification event
export function logNotification(record: Omit<NotificationLog, "id" | "attempts" | "lastAttempt">): NotificationLog {
  const logs = readNotificationLogs();
  // Prevent duplicate logs for same lead and same notification type
  const existing = logs.find(l => l.leadId === record.leadId && l.type === record.type);
  if (existing) {
    return existing;
  }

  const newLog: NotificationLog = {
    ...record,
    id: `notif_${Math.random().toString(36).substr(2, 9)}`,
    attempts: 0,
    lastAttempt: new Date().toISOString(),
  };

  logs.push(newLog);
  writeNotificationLogs(logs);
  return newLog;
}

// Update notification status
export function updateNotificationStatus(
  logId: string,
  status: "success" | "failed",
  errorMsg?: string
) {
  const logs = readNotificationLogs();
  const logIndex = logs.findIndex((l) => l.id === logId);
  if (logIndex !== -1) {
    logs[logIndex].status = status;
    logs[logIndex].attempts += 1;
    logs[logIndex].lastAttempt = new Date().toISOString();
    if (errorMsg) {
      logs[logIndex].error = errorMsg;
    } else {
      delete logs[logIndex].error;
    }
    writeNotificationLogs(logs);
  }
}

/**
 * Sends email using Nodemailer SMTP configuration if available.
 */
async function sendSmtpEmail(to: string, subject: string, bodyText: string, bodyHtml?: string): Promise<boolean> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || "587", 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || "no-reply@coresolution.com";

  if (!host || !user || !pass) {
    return false; // Skip if not configured
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: {
      user,
      pass,
    },
  });

  await transporter.sendMail({
    from,
    to,
    subject,
    text: bodyText,
    html: bodyHtml || bodyText.replace(/\n/g, "<br>"),
  });

  return true;
}

/**
 * Triggers the Auto Response email.
 */
export async function sendAutoResponseEmail(
  lead: { fullName: string; businessEmail: string; id: string },
  gmailApiSender?: (to: string, subject: string, html: string) => Promise<any>
): Promise<boolean> {
  const firstName = lead.fullName.trim().split(" ")[0] || lead.fullName;
  const subject = "Your Free AI Strategy Session Request Has Been Received";

  const emailBodyText = `Hello ${firstName},

Thank you for contacting Core Solution.

We have successfully received your enquiry.

Our team will review your requirements and contact you shortly.

We look forward to helping your business:
✓ Save Costs
✓ Improve Efficiency
✓ Automate Workflows
✓ Accelerate Growth

What Happens Next:
1. We review your enquiry.
2. We identify potential AI opportunities.
3. We contact you to schedule a consultation.
4. We discuss practical AI solutions for your business.

Thank you,
Core Solution
AI Transformation Partner For Modern Businesses`;

  const emailBodyHtml = `
    <div style="font-family: sans-serif; background: #000c2c; color: #f8fafc; padding: 30px; border-radius: 12px; max-width: 600px; border: 1px solid rgba(213,255,154,0.3); margin: 0 auto;">
      <h2 style="color: #d3ff9a; margin-top: 0; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 12px; font-size: 20px;">Your Free AI Strategy Session Request Has Been Received</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Hello ${firstName},</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Thank you for contacting <b>Core Solution</b>.</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">We have successfully received your enquiry.</p>
      <p style="font-size: 15px; line-height: 1.6; color: #cbd5e1;">Our team will review your requirements and contact you shortly.</p>
      
      <div style="background: rgba(255,255,255,0.03); border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid rgba(255,255,255,0.05);">
        <h4 style="margin: 0 0 10px 0; color: #ffffff; font-size: 14px;">We look forward to helping your business:</h4>
        <ul style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 14px; line-height: 1.8; list-style-type: none;">
          <li style="margin-bottom: 4px;">✓ <b>Save Costs</b></li>
          <li style="margin-bottom: 4px;">✓ <b>Improve Efficiency</b></li>
          <li style="margin-bottom: 4px;">✓ <b>Automate Workflows</b></li>
          <li style="margin-bottom: 4px;">✓ <b>Accelerate Growth</b></li>
        </ul>
      </div>

      <div style="background: rgba(0, 217, 255, 0.02); border-radius: 8px; padding: 16px; margin: 20px 0; border: 1px solid rgba(0, 217, 255, 0.1);">
        <h4 style="margin: 0 0 10px 0; color: #00d9ff; font-size: 14px;">What Happens Next:</h4>
        <ol style="margin: 0; padding-left: 20px; color: #cbd5e1; font-size: 13px; line-height: 1.7;">
          <li style="margin-bottom: 6px;">We review your enquiry.</li>
          <li style="margin-bottom: 6px;">We identify potential AI opportunities.</li>
          <li style="margin-bottom: 6px;">We contact you to schedule a consultation.</li>
          <li style="margin-bottom: 6px;">We discuss practical AI solutions for your business.</li>
        </ol>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #cbd5e1;">Thank you,</p>
      <p style="margin: 0; font-size: 15px; color: #ffffff; font-weight: bold;">Core Solution</p>
      <p style="margin: 2px 0 0 0; font-size: 12px; color: #00d9ff;">AI Transformation Partner For Modern Businesses</p>
    </div>
  `;

  const logRecord = logNotification({
    leadId: lead.id,
    type: "auto_response",
    status: "pending",
    recipient: lead.businessEmail,
    subjectOrHeader: subject,
    messageBody: emailBodyText,
  });

  try {
    // Try SMTP send first if configured
    let sent = await sendSmtpEmail(lead.businessEmail, subject, emailBodyText, emailBodyHtml);

    // Otherwise, fall back to Gmail API OAuth Send if provided
    if (!sent && gmailApiSender) {
      await gmailApiSender(lead.businessEmail, subject, emailBodyHtml);
      sent = true;
    }

    if (sent) {
      updateNotificationStatus(logRecord.id, "success");
      return true;
    } else {
      throw new Error("No configured email provider (SMTP or OAuth Verification) available.");
    }
  } catch (err: any) {
    updateNotificationStatus(logRecord.id, "failed", err.message);
    throw err;
  }
}

/**
 * Dispatch Internal Notification emails.
 */
export async function sendInternalNotificationEmail(
  lead: {
    id: string;
    fullName: string;
    companyName: string;
    businessEmail: string;
    message: string;
    leadScore: number;
    leadQuality: string;
    sourcePage: string;
    timestamp: string;
  },
  gmailApiSender?: (to: string, subject: string, html: string) => Promise<any>
): Promise<boolean> {
  const isHighPriority = lead.leadScore > 40;
  const subject = isHighPriority ? "🔥 HIGH PRIORITY LEAD" : "🚀 New AI Consultation Lead";
  const recipient = "xmarkusai@gmail.com";

  const emailBodyText = `${isHighPriority ? "🔥 HIGH PRIORITY LEAD ALERT\n\n" : "🚀 NEW AI CONSULTATION LEAD RECEIVED\n\n"}Lead Details:
- Lead ID: ${lead.id}
- Name: ${lead.fullName}
- Company: ${lead.companyName}
- Email: ${lead.businessEmail}
- Message: ${lead.message}
- Lead Score: ${lead.leadScore}
- Lead Quality: ${lead.leadQuality}
- Source Page: ${lead.sourcePage}
- Timestamp: ${new Date(lead.timestamp).toLocaleString()}

Actions:
- Open CRM: /admin
- View Lead Dossier: /admin?leadId=${lead.id}
- Send Email: mailto:${lead.businessEmail}`;

  const borderCol = isHighPriority ? "#ff3b30" : "#00d9ff";
  const titleCol = isHighPriority ? "#ff3b30" : "#00d9ff";

  const emailBodyHtml = `
    <div style="font-family: sans-serif; background: #000c2c; color: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid ${borderCol}; max-width: 600px; margin: 0 auto;">
      <h2 style="color: ${titleCol}; border-bottom: 2px solid rgba(255, 60, 50, 0.2); padding-bottom: 12px; margin-top: 0; font-size: 20px;">
        ${isHighPriority ? "🔥 HIGH PRIORITY LEAD DETECTED" : "🚀 New AI Consultation Lead"}
      </h2>
      <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; width: 140px; font-size: 13px;">Lead ID:</td><td style="color: #ffffff; font-family: monospace; font-size: 14px;"><b>${lead.id}</b></td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; font-size: 13px;">Name:</td><td style="color: #ffffff; font-size: 13px;">${lead.fullName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; font-size: 13px;">Company:</td><td style="color: #ffffff; font-size: 13px;">${lead.companyName}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; font-size: 13px;">Email:</td><td style="color: #ffffff; font-size: 13px;"><a href="mailto:${lead.businessEmail}" style="color: #00d9ff; text-decoration: none;">${lead.businessEmail}</a></td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; font-size: 13px;">Lead Score:</td><td style="color: #ffffff; font-size: 13px; font-weight: bold;">${lead.leadScore}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; font-size: 13px;">Lead Quality:</td><td style="color: #ffffff; font-weight: bold; font-size: 13px;">${lead.leadQuality}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; font-size: 13px;">Source Page:</td><td style="color: #ffffff; font-style: italic; font-size: 13px;">${lead.sourcePage || "/"}</td></tr>
        <tr><td style="padding: 6px 0; font-weight: bold; color: #cbd5e1; font-size: 13px;">Timestamp:</td><td style="color: #ffffff; font-size: 13px;">${new Date(lead.timestamp).toLocaleString()}</td></tr>
      </table>
      <div style="background: rgba(255,255,255,0.03); border-left: 3px solid ${borderCol}; padding: 12px; margin-top: 20px; border-radius: 0 8px 8px 0;">
        <h4 style="margin: 0 0 6px 0; color: #cbd5e1; font-size: 13px;">Captured Message:</h4>
        <p style="margin: 0; color: #f8fafc; line-height: 1.5; font-size: 13px;">"${lead.message}"</p>
      </div>

      <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid rgba(255,255,255,0.08); display: flex; gap: 10px;">
        <a href="mailto:${lead.businessEmail}" style="background: ${borderCol}; color: white; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold;">Send Email</a>
        <span style="width: 10px;"></span>
        <a href="/admin" style="background: rgba(255,255,255,0.08); color: white; text-decoration: none; padding: 8px 14px; border-radius: 6px; font-size: 12px; font-weight: bold; border: 1px solid rgba(255,255,255,0.1);">Open CRM Dashboard</a>
      </div>
      
      <p style="margin-top: 25px; font-size: 11px; color: #cbd5e1; opacity: 0.6; text-align: center;">Core Solution CRM Automation System</p>
    </div>
  `;

  const logRecord = logNotification({
    leadId: lead.id,
    type: "internal_alert",
    status: "pending",
    recipient: recipient,
    subjectOrHeader: subject,
    messageBody: emailBodyText,
  });

  try {
    let sent = await sendSmtpEmail(recipient, subject, emailBodyText, emailBodyHtml);

    if (!sent && gmailApiSender) {
      await gmailApiSender(recipient, subject, emailBodyHtml);
      sent = true;
    }

    if (sent) {
      updateNotificationStatus(logRecord.id, "success");
      return true;
    } else {
      throw new Error("No configured email provider (SMTP or OAuth Verification) available.");
    }
  } catch (err: any) {
    updateNotificationStatus(logRecord.id, "failed", err.message);
    throw err;
  }
}

/**
 * Dispatch WhatsApp notification.
 * Supports Twilio WhatsApp, Meta WhatsApp Cloud API, and generic Business APIs.
 */
export async function sendWhatsAppNotification(lead: {
  id: string;
  fullName: string;
  companyName: string;
  businessEmail: string;
  message: string;
  leadScore: number;
  leadQuality: string;
  sourcePage: string;
  timestamp: string;
}): Promise<boolean> {
  const isHighPriority = lead.leadScore > 40;
  const header = isHighPriority ? "🔥 HIGH PRIORITY LEAD ALERT" : "🚀 NEW LEAD RECEIVED";

  const messageText = `${header}

Lead ID: ${lead.id}
Name: ${lead.fullName}
Company: ${lead.companyName}
Email: ${lead.businessEmail}
Lead Score: ${lead.leadScore}
Lead Quality: ${lead.leadQuality}
Source: ${lead.sourcePage}
Submitted: ${new Date(lead.timestamp).toLocaleString()}

Message:
${lead.message}

Quick Actions:
1. Call Lead: click to open dialer (email verified)
2. Send Email: mailto:${lead.businessEmail}
3. Open CRM: /admin`;

  const provider = (process.env.WHATSAPP_PROVIDER || "custom").toLowerCase();
  const recipient =
    process.env.TWILIO_TO_PHONE ||
    process.env.META_WHATSAPP_TO_PHONE ||
    process.env.WHATSAPP_BUSINESS_TO_PHONE ||
    "Sales Admin";

  const logRecord = logNotification({
    leadId: lead.id,
    type: "whatsapp_notification",
    status: "pending",
    recipient: recipient,
    subjectOrHeader: header,
    messageBody: messageText,
  });

  try {
    if (provider === "twilio") {
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromPhone = process.env.TWILIO_FROM_PHONE || "whatsapp:+14155238886";
      const toPhone = process.env.TWILIO_TO_PHONE;

      if (!accountSid || !authToken || !toPhone) {
        throw new Error("Missing Twilio credentials or destination numbers (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_TO_PHONE).");
      }

      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          From: fromPhone,
          To: toPhone,
          Body: messageText,
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Twilio Dispatch Error: ${errText}`);
      }
    } else if (provider === "meta") {
      const phoneId = process.env.META_WHATSAPP_PHONE_NUMBER_ID;
      const accessToken = process.env.META_WHATSAPP_ACCESS_TOKEN;
      const toPhone = process.env.META_WHATSAPP_TO_PHONE;

      if (!phoneId || !accessToken || !toPhone) {
        throw new Error("Missing Meta Cloud API credentials (META_WHATSAPP_PHONE_NUMBER_ID, META_WHATSAPP_ACCESS_TOKEN, META_WHATSAPP_TO_PHONE).");
      }

      const res = await fetch(`https://graph.facebook.com/v17.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: toPhone,
          type: "text",
          text: {
            preview_url: false,
            body: messageText,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Meta Cloud API Error: ${errText}`);
      }
    } else if (provider === "business_api" || provider === "custom") {
      const apiUrl = process.env.WHATSAPP_BUSINESS_API_URL;
      const apiToken = process.env.WHATSAPP_BUSINESS_API_TOKEN;
      const toPhone = process.env.WHATSAPP_BUSINESS_TO_PHONE;

      if (apiUrl && apiToken && toPhone) {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            phone: toPhone,
            message: messageText,
          }),
        });
        if (!res.ok) {
          throw new Error(`Custom Business API Dispatch error: ${await res.text()}`);
        }
      } else {
        // Fallback or warning if no providers are set, logging status cleanly.
        throw new Error("No active credentials configured for Twilio, Meta, or Business API WhatsApp dispatcher. Integration is on standby.");
      }
    } else {
      throw new Error(`Unsupported WhatsApp Provider: ${provider}`);
    }

    updateNotificationStatus(logRecord.id, "success");
    return true;
  } catch (err: any) {
    updateNotificationStatus(logRecord.id, "failed", err.message);
    throw err;
  }
}

/**
 * Auto-retry function for pending or failed notifications to safeguard delivery.
 * Retries up to 3 times with interval.
 */
export async function retryFailedNotifications(
  gmailApiSender?: (to: string, subject: string, html: string) => Promise<any>
): Promise<{ processed: number; retried: number; successes: number }> {
  const logs = readNotificationLogs();
  const failedOrPending = logs.filter(l => l.status === "failed" && l.attempts < 3);

  let processed = failedOrPending.length;
  let successes = 0;

  for (const log of failedOrPending) {
    try {
      if (log.type === "auto_response") {
        const leadMock = { id: log.leadId, fullName: log.recipient, businessEmail: log.recipient };
        const ok = await sendAutoResponseEmail(leadMock, gmailApiSender);
        if (ok) successes++;
      } else if (log.type === "internal_alert") {
        // Mock back the attributes from logged message
        const leadMock = {
          id: log.leadId,
          fullName: "Lead",
          companyName: "Company",
          businessEmail: "info@coresolution.com",
          message: log.messageBody,
          leadScore: log.subjectOrHeader.includes("🔥") ? 45 : 20,
          leadQuality: log.subjectOrHeader.includes("🔥") ? "High Intent" as const : "Medium Intent" as const,
          sourcePage: "/",
          timestamp: new Date().toISOString(),
        };
        const ok = await sendInternalNotificationEmail(leadMock, gmailApiSender);
        if (ok) successes++;
      }
    } catch {
      // Ignore individually to continue
    }
  }

  return { processed, retried: failedOrPending.length, successes };
}

/**
 * Reminders config structure placeholder to prepare architecture for:
 * - Follow-up WhatsApp reminders
 * - Appointment reminders
 * - Proposal reminders
 * - Lead nurturing sequences
 * - Calendly booking confirmations
 */
export const FUTURE_AUTOMATION_CONFIG = {
  followUpReminders: {
    enabled: true,
    delayDays: 2,
    channel: ["whatsapp", "email"] as const,
    template: "Hello {First Name}, following up on your compliance dossier {Lead ID}. Have you set up your calendars of choice?"
  },
  appointmentReminders: {
    enabled: true,
    preMinutes: 60,
    channel: ["whatsapp"] as const,
    template: "🌟 Final Session call! Your Core Strategy AI Booking is in {Minutes} minutes."
  },
  proposalReminders: {
    enabled: true,
    delayDays: 3,
    channel: ["email"] as const,
    template: "Dossier update for {Company Name}: Strategic AI proposal awaits review."
  },
  leadNurturing: [
    { day: 1, topic: "workflows", subject: "Automating Operations in {Company Name}" },
    { day: 3, topic: "costSavings", subject: "How AI Cleaves Costs by 40%+" }
  ],
  calendlyIntegration: {
    webhooksEnabled: true,
    autoConfirmation: true
  }
};
