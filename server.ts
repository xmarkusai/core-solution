import express from "express";
import path from "path";
import fs from "node:fs";
import crypto from "node:crypto";
import { createServer as createViteServer } from "vite";
import { pushLeadToGoogleSheets, isGoogleSheetsConfigured } from "./src/lib/googleSheets";
import {
  sendAutoResponseEmail,
  sendInternalNotificationEmail,
  sendWhatsAppNotification,
  retryFailedNotifications
} from "./src/lib/notificationService";

const app = express();
const PORT = 3000;

// Enable JSON and urlencoded body support
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- DATABASE PATHS & SETUP ---
const DATA_DIR = path.join(process.cwd(), "data", "crm");
const LEADS_FILE = path.join(DATA_DIR, "leads.json");
const TIMELINE_FILE = path.join(DATA_DIR, "timeline.json");
const ANALYTICS_FILE = path.join(DATA_DIR, "analytics.json");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");

// Ensure data directory and files exist
function initDatabase() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEADS_FILE)) {
    fs.writeFileSync(LEADS_FILE, "[]", "utf-8");
  }
  if (!fs.existsSync(TIMELINE_FILE)) {
    fs.writeFileSync(TIMELINE_FILE, "[]", "utf-8");
  }
  if (!fs.existsSync(ANALYTICS_FILE)) {
    fs.writeFileSync(
      ANALYTICS_FILE,
      JSON.stringify({ form_views: 0, form_starts: 0, form_submissions: 0, successful_leads: 0 }),
      "utf-8"
    );
  }
  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(
      SETTINGS_FILE,
      JSON.stringify({ spreadsheetId: "", googleAccessToken: "", googleTokenExpiresAt: 0 }),
      "utf-8"
    );
  }
}

initDatabase();

// --- TYPE DEFINITIONS ---
interface LocalLead {
  timestamp: string;
  id: string;
  fullName: string;
  companyName: string;
  businessEmail: string;
  message: string;
  sourcePage: string;
  leadStatus: "New Lead" | "Contacted" | "Discovery Call Scheduled" | "Proposal Sent" | "Won" | "Lost";
  leadScore: number;
  leadQuality: "Low Intent" | "Medium Intent" | "High Intent";
  lastUpdated: string;
  followUpDate: string;
  notes: string;
  sync_pending?: boolean;
}

interface TimelineRecord {
  timestamp: string;
  leadId: string;
  action: string;
  details: string;
}

interface AnalyticsData {
  form_views: number;
  form_starts: number;
  form_submissions: number;
  successful_leads: number;
}

interface Settings {
  spreadsheetId: string;
  googleAccessToken: string;
  googleTokenExpiresAt: number;
}

// --- HELPERS FOR LOCAL READ/WRITE ---
function readLeads(): LocalLead[] {
  return JSON.parse(fs.readFileSync(LEADS_FILE, "utf-8"));
}

function writeLeads(leads: LocalLead[]) {
  fs.writeFileSync(LEADS_FILE, JSON.stringify(leads, null, 2), "utf-8");
}

function readTimeline(): TimelineRecord[] {
  return JSON.parse(fs.readFileSync(TIMELINE_FILE, "utf-8"));
}

function writeTimeline(records: TimelineRecord[]) {
  fs.writeFileSync(TIMELINE_FILE, JSON.stringify(records, null, 2), "utf-8");
}

function readAnalytics(): AnalyticsData {
  return JSON.parse(fs.readFileSync(ANALYTICS_FILE, "utf-8"));
}

function writeAnalytics(data: AnalyticsData) {
  fs.writeFileSync(ANALYTICS_FILE, JSON.stringify(data, null, 2), "utf-8");
}

function readSettings(): Settings {
  return JSON.parse(fs.readFileSync(SETTINGS_FILE, "utf-8"));
}

function writeSettings(settings: Settings) {
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2), "utf-8");
}

function addTimelineRecord(leadId: string, action: string, details: string) {
  const timeline = readTimeline();
  timeline.unshift({
    timestamp: new Date().toISOString(),
    leadId,
    action,
    details,
  });
  writeTimeline(timeline);
}

// --- CRYPTO SESSIONS IN-MEMORY ---
interface Session {
  username: string;
  lastAccessTime: number;
  csrfToken: string;
}
const activeSessions = new Map<string, Session>();
// Session expiry: 15 minutes of inactivity
const SESSION_EXPIRY_MS = 15 * 60 * 1000;

// Rate limiter / spam protection
const requestStats = new Map<string, { count: number; windowStart: number }>();
function checkRateLimit(ip: string, limit = 10, windowMs = 60000): boolean {
  const now = Date.now();
  const stat = requestStats.get(ip);
  if (!stat || now - stat.windowStart > windowMs) {
    requestStats.set(ip, { count: 1, windowStart: now });
    return true;
  }
  stat.count++;
  if (stat.count > limit) {
    return false;
  }
  return true;
}

// Cookie parser utility
function getCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const cookies = cookieHeader.split(";");
  for (const c of cookies) {
    const [key, value] = c.trim().split("=");
    if (key === name) return value;
  }
  return null;
}

// Validate environment-configured or default password
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "Core@940915";

// --- MIDDLEWARES ---
function sanitizeInput(req: express.Request, res: express.Response, next: express.NextFunction) {
  if (req.body) {
    for (const key of Object.keys(req.body)) {
      if (typeof req.body[key] === "string") {
        // Basic HTML strip/sanitize to prevent tag Injection
        req.body[key] = req.body[key].replace(/<[^>]*>/g, "").trim();
      }
    }
  }
  next();
}

function requireAdminSession(req: express.Request, res: express.Response, next: express.NextFunction) {
  const sessionId = getCookie(req.headers.cookie, "crm_session");
  if (!sessionId) {
    return res.status(401).json({ error: "Session expired or unauthorized. Please log in." });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ error: "Session expired or unauthorized. Please log in." });
  }

  const now = Date.now();
  if (now - session.lastAccessTime > SESSION_EXPIRY_MS) {
    activeSessions.delete(sessionId);
    res.setHeader("Set-Cookie", "crm_session=; Path=/; HttpOnly; Max-Age=0");
    return res.status(401).json({ error: "Session inactive. Please log in." });
  }

  // Update last active timestamp
  session.lastAccessTime = now;
  // Make session details available on the request
  (req as any).session = session;
  next();
}

// --- GOOGLE WORKSPACE API INTEG (BACKEND ROUTINES) ---
async function sendGmailApi(accessToken: string, to: string, subject: string, bodyHtml: string) {
  // Construct RFC822 email message
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString("base64")}?=`;
  const emailLines = [
    `To: ${to}`,
    `Subject: ${utf8Subject}`,
    "Content-Type: text/html; charset=utf-8",
    "MIME-Version: 1.0",
    "",
    bodyHtml,
  ];
  const emailString = emailLines.join("\r\n");
  const rawBase64Url = Buffer.from(emailString)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ raw: rawBase64Url }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Gmail API failed: ${errText}`);
  }
  return response.json();
}

async function verifyOrCreateSpreadsheet(accessToken: string): Promise<string> {
  const settings = readSettings();
  if (settings.spreadsheetId) {
    // Basic test if spreadsheet exists
    try {
      const response = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${settings.spreadsheetId}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (response.ok) {
        return settings.spreadsheetId;
      }
    } catch {
      // Continue to create new
    }
  }

  // Create new spreadsheet called "Core Solution CRM"
  const response = await fetch("https://sheets.googleapis.com/v4/spreadsheets", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        title: "Core Solution CRM",
      },
      sheets: [
        { properties: { title: "Leads" } },
        { properties: { title: "Dashboard" } },
        { properties: { title: "Activity Timeline" } },
      ],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Failed to create spreadsheet: ${errText}`);
  }

  const sheetData = await response.json();
  const spreadsheetId = sheetData.spreadsheetId;

  // Initialize worksheet headers
  const leadsHeaders = [
    "Timestamp",
    "Lead ID",
    "Full Name",
    "Company Name",
    "Business Email",
    "Message",
    "Source Page",
    "Lead Status",
    "Lead Score",
    "Lead Quality",
    "Last Updated",
    "Follow Up Date",
    "Notes",
  ];
  const timelineHeaders = ["Timestamp", "Lead ID", "Action", "Details"];
  const dbHeaders = ["Metric", "Value"];

  // Append Leads Headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:M1?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [leadsHeaders] }),
  });

  // Append Timeline Headers
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Activity Timeline'!A1:D1?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: [timelineHeaders] }),
  });

  settings.spreadsheetId = spreadsheetId;
  writeSettings(settings);
  return spreadsheetId;
}

async function syncLeadToGoogleSheets(accessToken: string, lead: LocalLead) {
  const spreadsheetId = await verifyOrCreateSpreadsheet(accessToken);

  // 1. Append lead row
  const leadRow = [
    lead.timestamp,
    lead.id,
    lead.fullName,
    lead.companyName,
    lead.businessEmail,
    lead.message,
    lead.sourcePage,
    lead.leadStatus,
    lead.leadScore,
    lead.leadQuality,
    lead.lastUpdated,
    lead.followUpDate,
    lead.notes,
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1?valueInputOption=RAW`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range: "Leads!A1",
      majorDimension: "ROWS",
      values: [leadRow],
    }),
  });

  // 2. Append Timeline Record
  const timelineRow = [lead.timestamp, lead.id, "Lead Created", `Intake process completed for ${lead.fullName} at ${lead.companyName}.`];
  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Activity Timeline'!A1?valueInputOption=RAW`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      range: "'Activity Timeline'!A1",
      majorDimension: "ROWS",
      values: [timelineRow],
    }),
  });

  // 3. Update Dashboard Stats in Google Sheets
  await updateGoogleSheetsDashboard(accessToken, spreadsheetId);
}

async function updateGoogleSheetsDashboard(accessToken: string, spreadsheetId: string) {
  const leads = readLeads();
  const total = leads.length;
  const newLeads = leads.filter((l) => l.leadStatus === "New Lead").length;
  const contacted = leads.filter((l) => l.leadStatus === "Contacted").length;
  const calls = leads.filter((l) => l.leadStatus === "Discovery Call Scheduled").length;
  const proposals = leads.filter((l) => l.leadStatus === "Proposal Sent").length;
  const won = leads.filter((l) => l.leadStatus === "Won").length;
  const lost = leads.filter((l) => l.leadStatus === "Lost").length;
  const highPriority = leads.filter((l) => l.leadQuality === "High Intent").length;
  const avgScore = total > 0 ? Math.round(leads.reduce((s, x) => s + x.leadScore, 0) / total) : 0;
  const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;

  const dashboardRows = [
    ["Metric", "Value"],
    ["Total Leads", total],
    ["New Leads", newLeads],
    ["Contacted Leads", contacted],
    ["Discovery Calls Scheduled", calls],
    ["Proposals Sent", proposals],
    ["Won Deals", won],
    ["Lost Deals", lost],
    ["Conversion Rate", `${conversionRate}%`],
    ["High Priority Leads", highPriority],
    ["Average Lead Score", avgScore],
    ["Last Synced At", new Date().toLocaleString()],
  ];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Dashboard!A1:B12?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: dashboardRows }),
  });
}

// Full Sync (all pending syncs) triggered on admin view
async function executeFullSyncData(accessToken: string) {
  const leads = readLeads();
  const timeline = readTimeline();
  const spreadsheetId = await verifyOrCreateSpreadsheet(accessToken);

  // Erase and completely refresh the Lead/Timeline sheets to stay perfectly matched
  const leadsHeaders = [
    "Timestamp",
    "Lead ID",
    "Full Name",
    "Company Name",
    "Business Email",
    "Message",
    "Source Page",
    "Lead Status",
    "Lead Score",
    "Lead Quality",
    "Last Updated",
    "Follow Up Date",
    "Notes",
  ];
  const leadsRows = [leadsHeaders, ...leads.map((l) => [
    l.timestamp,
    l.id,
    l.fullName,
    l.companyName,
    l.businessEmail,
    l.message,
    l.sourcePage,
    l.leadStatus,
    l.leadScore,
    l.leadQuality,
    l.lastUpdated,
    l.followUpDate,
    l.notes,
  ])];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:M${leadsRows.length}?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: leadsRows }),
  });

  const timelineHeaders = ["Timestamp", "Lead ID", "Action", "Details"];
  const timelineRows = [timelineHeaders, ...timeline.map((t) => [
    t.timestamp,
    t.leadId,
    t.action,
    t.details,
  ])];

  await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Activity Timeline'!A1:D${timelineRows.length}?valueInputOption=RAW`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ values: timelineRows }),
  });

  await updateGoogleSheetsDashboard(accessToken, spreadsheetId);

  // Clear sync flags
  let updated = false;
  const newLeadsList = leads.map((l) => {
    if (l.sync_pending) {
      updated = true;
      return { ...l, sync_pending: false };
    }
    return l;
  });
  if (updated) {
    writeLeads(newLeadsList);
  }
}

// --- PUBLIC LEAD SUBMISSION API ---
app.post("/api/leads/submit", sanitizeInput, async (req, res) => {
  const ip = req.ip || "127.0.0.1";
  if (!checkRateLimit(ip, 5, 60000)) {
    return res.status(429).json({ error: "Spam block activated. Please coordinate requests slowly." });
  }

  const { fullName, companyName, businessEmail, message, sourcePage, phone_honeypot } = req.body;

  // Honeypot spam intercept checks
  if (phone_honeypot) {
    console.log("Honeypot form submission intercepted. Ignoring silently.");
    return res.status(200).json({ success: true, leadId: `CS-${~~(Math.random()*10000)}` });
  }

  // 1. Validate Form
  if (!fullName || !companyName || !businessEmail || !message) {
    return res.status(400).json({ error: "Required fields are missing." });
  }
  if (!/\S+@\S+\.\S+/.test(businessEmail)) {
    return res.status(400).json({ error: "A valid business email address is required." });
  }

  // Update submission analytics tracker
  const analytics = readAnalytics();
  analytics.form_submissions++;
  writeAnalytics(analytics);

  // 2. Generate Lead ID
  const leads = readLeads();
  let nextNum = 1;
  const idRegex = /^CS-(\d{4})$/;
  leads.forEach((l) => {
    const match = l.id.match(idRegex);
    if (match) {
      const num = parseInt(match[1], 10);
      if (num >= nextNum) {
        nextNum = num + 1;
      }
    }
  });
  const leadId = `CS-${String(nextNum).padStart(4, "0")}`;

  // 3. Calculate Lead Score
  // Company Name provided: +10
  // Business Email provided: +10
  // Message Length > 50 characters: +10
  // Message Length > 150 characters: +20
  let leadScore = 0;
  if (companyName.trim().length > 0) leadScore += 10;
  if (businessEmail.trim().length > 0) leadScore += 10;
  if (message.trim().length > 50) leadScore += 10;
  if (message.trim().length > 150) leadScore += 20;

  // 4. Calculate Lead Quality
  // 0-20 = Low Intent / 21-40 = Medium Intent / 41+ = High Intent
  let leadQuality: "Low Intent" | "Medium Intent" | "High Intent" = "Low Intent";
  if (leadScore >= 41) {
    leadQuality = "High Intent";
  } else if (leadScore >= 21) {
    leadQuality = "Medium Intent";
  }

  // 5. Generate Follow-Up Date (+2 days from now)
  const futDate = new Date();
  futDate.setDate(futDate.getDate() + 2);
  const followUpStr = futDate.toISOString().split("T")[0];

  const nowStr = new Date().toISOString();

  // Create Local Lead Dossier Record
  const newLead: LocalLead = {
    timestamp: nowStr,
    id: leadId,
    fullName: fullName.trim(),
    companyName: companyName.trim(),
    businessEmail: businessEmail.trim(),
    message: message.trim(),
    sourcePage: sourcePage || "/",
    leadStatus: "New Lead",
    leadScore,
    leadQuality,
    lastUpdated: nowStr,
    followUpDate: followUpStr,
    notes: "",
    sync_pending: true,
  };

  // Add to database registry
  leads.unshift(newLead);
  writeLeads(leads);

  // Add initial timeline event
  addTimelineRecord(leadId, "Lead Created", `New inbound lead generated on CRM: ${fullName} (${companyName}) with a lead score of ${leadScore} (${leadQuality}).`);

  // Log successful lead
  analytics.successful_leads++;
  writeAnalytics(analytics);

  // 6 & 7. Send Emails + Google Sheet sync
  const settings = readSettings();
  let emailSent = false;
  let sheetSynced = false;

  // Add a "Lead Submitted" event to the timeline
  addTimelineRecord(leadId, "Lead Submitted", "Leads dossier intake form successfully submitted online. Initializing workflow automations.");

  // Define Gmail API sender wrapper to support old OAuth flow as well as standalone SMTP
  const gmailApiSender = async (to: string, subject: string, html: string) => {
    if (settings.googleAccessToken && settings.googleTokenExpiresAt > Date.now()) {
      await sendGmailApi(settings.googleAccessToken, to, subject, html);
    } else {
      throw new Error("Gmail token not active, falling back to SMTP");
    }
  };

  // 1) Auto Response Email to incoming Lead
  try {
    await sendAutoResponseEmail({ id: leadId, fullName, businessEmail }, gmailApiSender);
    emailSent = true;
    addTimelineRecord(leadId, "Auto Response Sent", `Auto response confirmation dispatched successfully to ${businessEmail}.`);
  } catch (err: any) {
    console.error("Auto response dispatch failed:", err.message);
  }

  // 2) Internal notification email to xmarkusai@gmail.com
  try {
    await sendInternalNotificationEmail({
      id: leadId,
      fullName,
      companyName,
      businessEmail,
      message,
      leadScore,
      leadQuality,
      sourcePage: sourcePage || "/",
      timestamp: nowStr,
    }, gmailApiSender);
    addTimelineRecord(leadId, "Email Notification Sent", "Strategic alert notification email transmitted to Sales Admin structure.");
  } catch (err: any) {
    console.error("Internal mail alert dispatch failed:", err.message);
  }

  // 3) WhatsApp notification via selected provider (Twilio or Meta)
  try {
    await sendWhatsAppNotification({
      id: leadId,
      fullName,
      companyName,
      businessEmail,
      message,
      leadScore,
      leadQuality,
      sourcePage: sourcePage || "/",
      timestamp: nowStr,
    });
    addTimelineRecord(leadId, "WhatsApp Notification Sent", "Automated WhatsApp sales dispatch registered and transmitted.");
  } catch (err: any) {
    console.error("WhatsApp dispatch failed:", err.message);
  }

  // 4) Background retry sequence to heal any temporary failed dispatches
  try {
    retryFailedNotifications(gmailApiSender).catch(e => console.error("Notification retrials error:", e.message));
  } catch (err) {}

  // Google Sheets Direct OAuth token Sync if valid
  const isTokenValid = settings.googleAccessToken && settings.googleTokenExpiresAt > Date.now();
  if (isTokenValid) {
    try {
      await syncLeadToGoogleSheets(settings.googleAccessToken, newLead);
      sheetSynced = true;
      newLead.sync_pending = false;
      writeLeads(leads);
      console.log(`Lead ${leadId} synchronized instantly to Google Sheets CRM!`);
    } catch (e: any) {
      console.error("Instant Sheets sync failed:", e.message);
    }
  }

  // Google Sheets Direct Service Account Sync using environment variables
  if (isGoogleSheetsConfigured()) {
    try {
      const saSynced = await pushLeadToGoogleSheets(newLead);
      if (saSynced) {
        sheetSynced = true;
        newLead.sync_pending = false;
        writeLeads(leads);
        addTimelineRecord(leadId, "Sheets Sync", "Lead dossier successfully synced and written to the Google Sheets Leads worksheet via Service Account.");
      }
    } catch (e: any) {
      console.error("Service Account sheets sync failed:", e.message);
    }
  }

  return res.status(200).json({
    success: true,
    leadId,
    instantEmail: emailSent,
    instantSheets: sheetSynced,
  });
});

// --- PUBLIC ANALYTICS TRACKING ROUTE ---
app.post("/api/analytics/track", (req, res) => {
  const { event } = req.body;
  const analytics = readAnalytics();

  if (event === "form_view") {
    analytics.form_views++;
  } else if (event === "form_start") {
    analytics.form_starts++;
  } else if (event === "form_submit") {
    analytics.form_submissions++;
  }

  writeAnalytics(analytics);
  return res.json({ success: true, analytics });
});

// --- ADMIN SESSION AUTHENTICATION ROUTES ---
app.post("/api/auth/login", sanitizeInput, (req, res) => {
  const { username, password } = req.body;

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    addTimelineRecord("SYSTEM", "Failed Login", `An unauthorized login attempt was made for the user '${username}'.`);
    return res.status(401).json({ error: "Invalid username or password credentials." });
  }

  // Generate secure random Session Token and CSRF Token
  const sessionId = crypto.randomUUID();
  const csrfToken = crypto.randomBytes(24).toString("hex");

  activeSessions.set(sessionId, {
    username,
    lastAccessTime: Date.now(),
    csrfToken,
  });

  // Set secure HTTPOnly session cookie
  res.setHeader(
    "Set-Cookie",
    `crm_session=${sessionId}; Path=/; HttpOnly; SameSite=Strict; Max-Age=36000` // 10 hours max
  );

  addTimelineRecord("SYSTEM", "Admin Login", "Administrator successfully logged into the core security admin portal.");

  return res.json({
    success: true,
    username,
    csrfToken,
  });
});

app.post("/api/auth/logout", (req, res) => {
  const sessionId = getCookie(req.headers.cookie, "crm_session");
  if (sessionId) {
    activeSessions.delete(sessionId);
  }
  res.setHeader("Set-Cookie", "crm_session=; Path=/; HttpOnly; Max-Age=0");
  return res.json({ success: true });
});

app.get("/api/auth/check", (req, res) => {
  const sessionId = getCookie(req.headers.cookie, "crm_session");
  if (!sessionId) {
    return res.status(401).json({ authenticated: false });
  }

  const session = activeSessions.get(sessionId);
  if (!session) {
    return res.status(401).json({ authenticated: false });
  }

  const now = Date.now();
  if (now - session.lastAccessTime > SESSION_EXPIRY_MS) {
    activeSessions.delete(sessionId);
    res.setHeader("Set-Cookie", "crm_session=; Path=/; HttpOnly; Max-Age=0");
    return res.status(401).json({ authenticated: false, reason: "Inactivity timeout" });
  }

  // Extend session lease
  session.lastAccessTime = now;
  return res.json({ authenticated: true, username: session.username, csrfToken: session.csrfToken });
});

// --- SECULATED API ROUTES (REQUIRES REQUIREADMINSESSION) ---

// Get consolidated Leads List
app.get("/api/admin/leads", requireAdminSession, (req, res) => {
  const leads = readLeads();
  return res.json({ success: true, leads });
});

// Update particular lead records (Status, Notes, Follow-up date)
app.post("/api/admin/leads/update", requireAdminSession, sanitizeInput, async (req, res) => {
  const { id, field, value } = req.body;
  if (!id || !field) {
    return res.status(400).json({ error: "Lead ID and field parameters required." });
  }

  const leads = readLeads();
  const index = leads.findIndex((l) => l.id === id);
  if (index === -1) {
    return res.status(404).json({ error: "Lead registry entry not found." });
  }

  const lead = leads[index];
  const oldValue = (lead as any)[field];
  (lead as any)[field] = value;
  lead.lastUpdated = new Date().toISOString();
  lead.sync_pending = true; // Mark for next sync refresh

  writeLeads(leads);

  // Add timeline change logs
  let timelineAction = "Status Updated";
  let detailsText = `Lead '${lead.fullName}' changed ${field} from '${oldValue}' to '${value}'.`;

  if (field === "leadStatus") {
    if (value === "Won") {
      timelineAction = "Lead Won";
      detailsText = `Deal closed successfully! Lead '${lead.fullName}' from ${lead.companyName} set to Won!`;
    } else if (value === "Lost") {
      timelineAction = "Lead Lost";
      detailsText = `Deal closed as unsuccessful. Lead '${lead.fullName}' from ${lead.companyName} set to Lost.`;
    } else {
      timelineAction = "Status Updated";
      detailsText = `Lead status for '${lead.fullName}' updated from '${oldValue}' to '${value}'.`;
    }
  } else if (field === "notes") {
    timelineAction = "Follow-Up Added";
    detailsText = `Internal administration notes updated for lead ${lead.fullName}: "${value.substring(0, 40)}${value.length > 40 ? "..." : ""}"`;
  } else if (field === "followUpDate") {
    timelineAction = "Follow-Up Added";
    detailsText = `Scheduled follow up date revised for lead ${lead.fullName} to ${value}.`;
  }

  addTimelineRecord(id, timelineAction, detailsText);

  // Sync back immediately if sheets accessToken exists
  const settings = readSettings();
  if (settings.googleAccessToken && settings.googleTokenExpiresAt > Date.now()) {
    try {
      await executeFullSyncData(settings.googleAccessToken);
    } catch (e: any) {
      console.warn("Autosync failed on lead update:", e.message);
    }
  }

  return res.json({ success: true, lead });
});

// Read System Activity logs
app.get("/api/admin/timeline", requireAdminSession, (req, res) => {
  const timeline = readTimeline();
  return res.json({ success: true, timeline });
});

// Read Analytics metrics
app.get("/api/admin/analytics", requireAdminSession, (req, res) => {
  const rawAnalytics = readAnalytics();
  const leads = readLeads();

  // Calculate stats
  const total = leads.length;
  const newLeads = leads.filter((l) => l.leadStatus === "New Lead").length;
  const contacted = leads.filter((l) => l.leadStatus === "Contacted").length;
  const calls = leads.filter((l) => l.leadStatus === "Discovery Call Scheduled").length;
  const proposals = leads.filter((l) => l.leadStatus === "Proposal Sent").length;
  const won = leads.filter((l) => l.leadStatus === "Won").length;
  const lost = leads.filter((l) => l.leadStatus === "Lost").length;
  const highPriority = leads.filter((l) => l.leadQuality === "High Intent").length;
  const avgScore = total > 0 ? Math.round(leads.reduce((s, x) => s + x.leadScore, 0) / total) : 0;
  const conversionRate = total > 0 ? parseFloat(((won / total) * 100).toFixed(1)) : 0;

  // Monthly breakdown mock (derive from timestamps)
  const monthlyLeads: Record<string, number> = {};
  leads.forEach((l) => {
    try {
      const monthStr = new Date(l.timestamp).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthlyLeads[monthStr] = (monthlyLeads[monthStr] || 0) + 1;
    } catch {
      // ignore parsing error
    }
  });

  return res.json({
    success: true,
    totalLeads: total,
    newLeads,
    contactedLeads: contacted,
    discoveryCallsScheduled: calls,
    proposalsSent: proposals,
    wonDeals: won,
    lostDeals: lost,
    conversionRate,
    highPriorityLeads: highPriority,
    averageLeadScore: avgScore,
    monthlyLeads,
    rawAnalytics: {
      form_views: rawAnalytics.form_views,
      form_starts: rawAnalytics.form_starts,
      form_submissions: rawAnalytics.form_submissions,
      successful_leads: rawAnalytics.successful_leads,
      conversionRate: rawAnalytics.form_views > 0 ? parseFloat(((rawAnalytics.form_submissions / rawAnalytics.form_views) * 100).toFixed(1)) : 0,
    },
  });
});

// Configure Google OAuth token securely on admin connection
app.post("/api/admin/settings/google-auth", requireAdminSession, sanitizeInput, async (req, res) => {
  const { accessToken, expiresIn } = req.body;
  if (!accessToken) {
    return res.status(400).json({ error: "Access token is missing." });
  }

  const settings = readSettings();
  settings.googleAccessToken = accessToken;
  settings.googleTokenExpiresAt = Date.now() + (expiresIn || 3500) * 1000;
  writeSettings(settings);

  addTimelineRecord("SYSTEM", "Google Connected", "Google Workspaces (Gmail and Sheets) connected successfully by authorization.");

  try {
    // Automatically trigger schema construction and full sync on initial connection
    await executeFullSyncData(accessToken);
    return res.json({ success: true, spreadsheetId: settings.spreadsheetId });
  } catch (e: any) {
    return res.json({ success: true, error: `Auth verified, but sheet sync failed: ${e.message}`, spreadsheetId: settings.spreadsheetId });
  }
});

// Hard sync queue manually
app.post("/api/admin/sync", requireAdminSession, async (req, res) => {
  const settings = readSettings();
  if (!settings.googleAccessToken || settings.googleTokenExpiresAt <= Date.now()) {
    return res.status(400).json({ error: "Google account authorization is missing or expired. Re-authenticate inside settings." });
  }

  try {
    await executeFullSyncData(settings.googleAccessToken);
    addTimelineRecord("SYSTEM", "CRM Synced", "Manual full synchronization successfully executed with Google Sheets server.");
    return res.json({ success: true, spreadsheetId: settings.spreadsheetId });
  } catch (e: any) {
    return res.status(500).json({ error: `Manual synchronization failure: ${e.message}` });
  }
});

// --- VITE DEV / PRODUCTION INGRESS ASSETS ---
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    // Mount Vite dev server middlewares
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Serve client Router SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[CRM SERVER] Active and listening at http://localhost:${PORT}`);
  });
}

startServer();
