import React, { useState, useEffect, useRef } from "react";
import { initializeApp } from "firebase/app";
import { getAuth, signInWithPopup, GoogleAuthProvider, signOut as fbSignOut } from "firebase/auth";
import {
  Sparkles,
  Lock,
  User as UserIcon,
  Eye,
  EyeOff,
  LogOut,
  Sliders,
  Users,
  TrendingUp,
  Activity,
  CheckCircle2,
  AlertTriangle,
  FolderSync,
  Clock,
  Search,
  Check,
  ChevronRight,
  Filter,
  Calendar,
  Layers,
  Inbox,
  FileSpreadsheet,
  RefreshCw,
  Mail,
  Building,
  Star,
  Check as CheckIcon,
  X as XIcon,
  ChevronDown
} from "lucide-react";
import firebaseConfig from "../../firebase-applet-config.json";

// Initialize Firebase App for CRM Google connection
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
provider.addScope("https://www.googleapis.com/auth/gmail.send");
provider.addScope("https://www.googleapis.com/auth/spreadsheets");

interface Lead {
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
}

interface TimelineRecord {
  timestamp: string;
  leadId: string;
  action: string;
  details: string;
}

interface AnalyticsStats {
  totalLeads: number;
  newLeads: number;
  contactedLeads: number;
  discoveryCallsScheduled: number;
  proposalsSent: number;
  wonDeals: number;
  lostDeals: number;
  conversionRate: number;
  highPriorityLeads: number;
  averageLeadScore: number;
  monthlyLeads: Record<string, number>;
  rawAnalytics: {
    form_views: number;
    form_starts: number;
    form_submissions: number;
    successful_leads: number;
    conversionRate: number;
  };
}

export default function AdminPortal() {
  // Authentication states
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [csrfToken, setCsrfToken] = useState("");

  // CRM Operational states
  const [activeTab, setActiveTab] = useState<"dashboard" | "leads" | "analytics" | "timeline" | "settings">("dashboard");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [timeline, setTimeline] = useState<TimelineRecord[]>([]);
  const [stats, setStats] = useState<AnalyticsStats | null>(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [dataError, setDataError] = useState("");

  // Google Integration states
  const [googleConnected, setGoogleConnected] = useState(false);
  const [googleSyncing, setGoogleSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");
  const [spreadsheetId, setSpreadsheetId] = useState("");

  // Leads Filters/Search
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [qualityFilter, setQualityFilter] = useState("all");
  const [sortField, setSortField] = useState<"timestamp" | "leadScore">("timestamp");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Selected Lead modal
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [updatingLeadField, setUpdatingLeadField] = useState(false);
  const [editNotes, setEditNotes] = useState("");
  const [editFollowUp, setEditFollowUp] = useState("");

  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- AUTOMATIC SESSION TIMEOUT AND AUTH CHOPPING ---
  const resetInactivityTimer = () => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }
    // Automatically log out after 15 minutes of inactivity (matches backend)
    inactivityTimerRef.current = setTimeout(() => {
      handleLogout();
    }, 15 * 60 * 1000);
  };

  useEffect(() => {
    if (isAuthenticated) {
      const events = ["mousedown", "mousemove", "keypress", "scroll", "touchstart"];
      events.forEach((name) => window.addEventListener(name, resetInactivityTimer));
      resetInactivityTimer();

      return () => {
        if (inactivityTimerRef.current) {
          clearTimeout(inactivityTimerRef.current);
        }
        events.forEach((name) => window.removeEventListener(name, resetInactivityTimer));
      };
    }
  }, [isAuthenticated]);

  // Check auth session on load
  useEffect(() => {
    const checkSession = async () => {
      try {
        const response = await fetch("/api/auth/check");
        const data = await response.json();
        if (response.ok && data.authenticated) {
          setIsAuthenticated(true);
          setCsrfToken(data.csrfToken);
          fetchCrmData();
        }
      } catch (err) {
        console.warn("Session check failed", err);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkSession();
  }, []);

  // Fetch all CRM administrative datasets
  const fetchCrmData = async () => {
    setDataLoading(true);
    setDataError("");
    try {
      const [leadsRes, timelineRes, statsRes] = await Promise.all([
        fetch("/api/admin/leads"),
        fetch("/api/admin/timeline"),
        fetch("/api/admin/analytics")
      ]);

      const leadsData = await leadsRes.json();
      const timelineData = await timelineRes.json();
      const statsData = await statsRes.json();

      if (leadsRes.ok && leadsData.success) {
        setLeads(leadsData.leads);
      }
      if (timelineRes.ok && timelineData.success) {
        setTimeline(timelineData.timeline);
      }
      if (statsRes.ok && statsData.success) {
        setStats(statsData);
      }
    } catch (err) {
      setDataError("Failed to fetch dashboard intelligence directory from CRM backend.");
    } finally {
      setDataLoading(false);
    }
  };

  // --- LOGIN OPERATION ---
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    if (!username.trim() || !password.trim()) {
      setLoginError("Please provide username and password credentials.");
      return;
    }

    setLoginLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: username.trim(), password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login authorization failed.");
      }

      setIsAuthenticated(true);
      setCsrfToken(data.csrfToken);
      fetchCrmData();
    } catch (err: any) {
      setLoginError(err.message || "Invalid administrative credentials.");
    } finally {
      setLoginLoading(false);
    }
  };

  // --- LOGOUT OPERATION ---
  const handleLogout = async () => {
    setIsAuthenticated(false);
    setCsrfToken("");
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.warn("Server side logout failed", err);
    }
  };

  // --- GOOGLE WORKSPACE AUTHENTICATION TRIGGERS ---
  const handleGoogleAuth = async () => {
    setGoogleSyncing(true);
    setSyncStatusMsg("Initializing Google strategic secure popup authorization...");
    try {
      const result = await signInWithPopup(auth, provider);
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken;

      if (!token) {
        throw new Error("Unable to retrieve Google OAuth access token.");
      }

      const syncResponse = await fetch("/api/admin/settings/google-auth", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({ accessToken: token, expiresIn: 3600 })
      });

      const syncResult = await syncResponse.json();

      if (!syncResponse.ok || !syncResult.success) {
        throw new Error(syncResult.error || "Could not save credentials to backend database.");
      }

      setGoogleConnected(true);
      setSpreadsheetId(syncResult.spreadsheetId || "");
      setSyncStatusMsg("Successfully connected! Initialized 'Core Solution CRM' Google spreadsheet with matching dashboard/timeline rows.");
      fetchCrmData();
    } catch (err: any) {
      setSyncStatusMsg(`Authorization failure: ${err.message || "Interrupted popup authorization flow"}`);
    } finally {
      setGoogleSyncing(false);
    }
  };

  // --- MANUAL FORCE SYNC TRIGGER ---
  const handleForceSync = async () => {
    setGoogleSyncing(true);
    setSyncStatusMsg("Saving CRM queue structures and syncing row entries to Google Sheets...");
    try {
      const response = await fetch("/api/admin/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        }
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Manual CRM synchronization failed.");
      }

      setSyncStatusMsg("Success! Fully synchronized all Lead records, Activity History, and Dashboard KPIs to Google Sheets.");
      setSpreadsheetId(data.spreadsheetId || "");
      fetchCrmData();
    } catch (err: any) {
      setSyncStatusMsg(`Synchronization error: ${err.message}`);
    } finally {
      setGoogleSyncing(false);
    }
  };

  // --- LEAD STATUS/NOTES/FOLLOWUP MUTATION UPDATE ---
  const handleUpdateLeadField = async (leadId: string, field: string, value: any) => {
    setUpdatingLeadField(true);
    try {
      const response = await fetch("/api/admin/leads/update", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-csrf-token": csrfToken
        },
        body: JSON.stringify({ id: leadId, field, value })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to submit lead change log.");
      }

      // Update local state
      const updatedLeads = leads.map((l) => (l.id === leadId ? { ...l, [field]: value } : l));
      setLeads(updatedLeads);

      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead({ ...selectedLead, [field]: value });
      }

      fetchCrmData();
    } catch (err: any) {
      alert(`Failed to save lead: ${err.message}`);
    } finally {
      setUpdatingLeadField(false);
    }
  };

  // Filter & Search Logic
  const filteredLeads = leads
    .filter((lead) => {
      const query = searchQuery.toLowerCase();
      const matchesSearch =
        lead.fullName.toLowerCase().includes(query) ||
        lead.companyName.toLowerCase().includes(query) ||
        lead.businessEmail.toLowerCase().includes(query) ||
        lead.id.toLowerCase().includes(query) ||
        lead.message.toLowerCase().includes(query);

      const matchesStatus = statusFilter === "all" || lead.leadStatus === statusFilter;
      const matchesQuality = qualityFilter === "all" || lead.leadQuality === qualityFilter;

      return matchesSearch && matchesStatus && matchesQuality;
    })
    .sort((a, b) => {
      const mult = sortOrder === "asc" ? 1 : -1;
      if (sortField === "leadScore") {
        return (a.leadScore - b.leadScore) * mult;
      }
      return (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()) * mult;
    });

  if (checkingAuth) {
    return (
      <div className="bg-[#000c2c] min-h-screen text-on-surface flex items-center justify-center font-sans relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-brand-tertiary/10 blur-[100px] rounded-full"></div>
        <div className="flex flex-col items-center gap-4 relative z-10">
          <RefreshCw className="h-10 w-10 text-brand-tertiary animate-spin" />
          <p className="font-mono text-xs text-on-surface-variant uppercase tracking-widest">
            Decrypting Core Solutions Admin Portal...
          </p>
        </div>
      </div>
    );
  }

  // --- RENDER LOGIN VIEW ---
  if (!isAuthenticated) {
    return (
      <div className="bg-[#000c2c] min-h-screen text-on-surface flex items-center justify-center font-sans relative overflow-hidden p-6 select-none bg-grid-pattern">
        {/* Neon Glow details */}
        <div className="absolute top-[20%] left-[25%] w-[350px] h-[350px] bg-brand-tertiary/10 blur-[120px] rounded-full pointer-events-none"></div>
        <div className="absolute bottom-[20%] right-[25%] w-[350px] h-[350px] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none"></div>

        <div className="w-full max-w-md relative z-10">
          {/* Elegant header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center bg-white/[0.03] p-3 rounded-2xl border border-white/5 shadow-inner mb-4">
              <Lock className="h-8 w-8 text-brand-tertiary animate-pulse" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white uppercase font-sans">
              Core Security Access
            </h1>
            <p className="text-on-surface-variant text-xs font-mono mt-1 tracking-wider uppercase">
              Protected CRM &amp; Lead Management Panel
            </p>
          </div>

          {/* Login glassmorphic card */}
          <div className="glass-card p-8 rounded-3xl border-white/10 relative overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-brand-tertiary/60 to-transparent"></div>

            <form onSubmit={handleLoginSubmit} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] font-bold tracking-widest text-brand-tertiary uppercase">
                  Operator Username
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Enter unique ID..."
                    autoComplete="username"
                    className="w-full glass-input rounded-xl px-4 py-3 pl-11 text-white text-sm focus:outline-none placeholder-on-surface-variant/30"
                  />
                  <UserIcon className="absolute top-1/2 left-4 -translate-y-1/2 h-4.5 w-4.5 text-on-surface-variant/40" />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="font-mono text-[10px] font-bold tracking-widest text-brand-secondary uppercase">
                  Strategic Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••••"
                    autoComplete="current-password"
                    className="w-full glass-input rounded-xl px-4 py-3 pl-11 pr-11 text-white text-sm focus:outline-none placeholder-on-surface-variant/30"
                  />
                  <Lock className="absolute top-1/2 left-4 -translate-y-1/2 h-4.5 w-4.5 text-on-surface-variant/40" />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute top-1/2 right-4 -translate-y-1/2 text-on-surface-variant/50 hover:text-white cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {loginError && (
                <div className="flex items-start gap-2.5 p-3.5 bg-red-500/10 border border-red-500/30 text-red-200 text-xs rounded-xl mt-1 leading-relaxed">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-red-400" />
                  <span>{loginError}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full relative overflow-hidden group rounded-xl py-3.5 mt-2 font-bold text-xs tracking-widest uppercase flex items-center justify-center gap-2 transition-all duration-300 bg-gradient-to-r from-brand-tertiary to-brand-primary text-[#001136] hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-[0_0_25px_rgba(0,217,255,0.4)] cursor-pointer"
              >
                {loginLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Authorizing Portal...</span>
                  </>
                ) : (
                  <>
                    <span>Decrypt Controls</span>
                    <ChevronRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>
          </div>

          <div className="text-center mt-6 text-[10px] font-mono text-on-surface-variant/50 tracking-wide">
            AUTOMATIC COOLDOWNS &amp; DESTRUCTION PROTOCOLS ENFORCED
          </div>
        </div>
      </div>
    );
  }

  // --- RENDER MAIN SAAS CRM VIEW ---
  return (
    <div className="bg-[#000c2c] min-h-screen text-on-surface font-sans flex flex-col md:flex-row bg-grid-pattern relative select-none">
      {/* Decorative neon ambient blobs */}
      <div className="absolute top-[10%] right-[10%] w-[500px] h-[500px] bg-brand-tertiary/5 blur-[150px] rounded-full pointer-events-none z-0"></div>
      <div className="absolute bottom-[10%] left-[5%] w-[450px] h-[450px] bg-brand-secondary/5 blur-[120px] rounded-full pointer-events-none z-0"></div>

      {/* --- DASHBOARD SIDEBAR NAVIGATION --- */}
      <aside className="w-full md:w-64 border-b md:border-b-0 md:border-r border-white/10 bg-[#000924]/80 backdrop-blur-2xl px-6 py-8 flex flex-col justify-between shrink-0 relative z-10">
        <div className="flex flex-col gap-10">
          {/* Logo brand */}
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-brand-tertiary to-brand-secondary rounded-xl text-brand-on-primary">
              <Sparkles className="h-5 w-5 animate-spin-slow" />
            </div>
            <div>
              <h2 className="font-bold text-sm tracking-widest text-white uppercase leading-none">
                CS RESOLVE
              </h2>
              <span className="text-[9px] font-mono tracking-widest text-brand-secondary uppercase mt-0.5 block">
                ADMIN CONSOLE
              </span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex flex-col gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold tracking-wider font-mono uppercase transition-all duration-300 cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-brand-tertiary/10 border border-brand-tertiary/30 text-brand-tertiary shadow-[0_0_15px_rgba(0,217,255,0.08)]"
                  : "border border-transparent text-on-surface-variant/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <TrendingUp className="h-4 w-4" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("leads")}
              className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold tracking-wider font-mono uppercase transition-all duration-300 cursor-pointer ${
                activeTab === "leads"
                  ? "bg-brand-tertiary/10 border border-brand-tertiary/30 text-brand-tertiary shadow-[0_0_15px_rgba(0,217,255,0.08)]"
                  : "border border-transparent text-on-surface-variant/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Leads Registry</span>
            </button>

            <button
              onClick={() => setActiveTab("analytics")}
              className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold tracking-wider font-mono uppercase transition-all duration-300 cursor-pointer ${
                activeTab === "analytics"
                  ? "bg-brand-tertiary/10 border border-brand-tertiary/30 text-brand-tertiary shadow-[0_0_15px_rgba(0,217,255,0.08)]"
                  : "border border-transparent text-on-surface-variant/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>Analytics</span>
            </button>

            <button
              onClick={() => setActiveTab("timeline")}
              className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold tracking-wider font-mono uppercase transition-all duration-300 cursor-pointer ${
                activeTab === "timeline"
                  ? "bg-brand-tertiary/10 border border-brand-tertiary/30 text-brand-tertiary shadow-[0_0_15px_rgba(0,217,255,0.08)]"
                  : "border border-transparent text-on-surface-variant/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>Security Logs</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3.5 px-4.5 py-3.5 rounded-xl text-xs font-semibold tracking-wider font-mono uppercase transition-all duration-300 cursor-pointer ${
                activeTab === "settings"
                  ? "bg-brand-tertiary/10 border border-brand-tertiary/30 text-brand-tertiary shadow-[0_0_15px_rgba(0,217,255,0.08)]"
                  : "border border-transparent text-on-surface-variant/75 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Sliders className="h-4 w-4" />
              <span>CRM settings</span>
            </button>
          </nav>
        </div>

        {/* Console Footers */}
        <div className="flex flex-col gap-4 mt-10">
          <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 text-[10px] font-bold font-mono uppercase">
              <span className="w-1.5 h-1.5 bg-brand-secondary rounded-full animate-ping"></span>
              <span className="text-brand-secondary">ACTIVE PROTOCOLS</span>
            </div>
            <p className="text-[9px] font-mono text-on-surface-variant/60 mt-1 uppercase leading-tight">
              AUTOCLOSE SECURED IN ANY CELL
            </p>
          </div>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-4.5 py-3 text-xs font-semibold text-red-400 hover:text-red-200 hover:bg-red-500/10 rounded-xl transition-all duration-300 cursor-pointer text-left w-full border border-transparent hover:border-red-500/20"
          >
            <LogOut className="h-4 w-4" />
            <span>TERMINATE SESSION</span>
          </button>
        </div>
      </aside>

      {/* --- DASHBOARD ACTION AREA --- */}
      <main className="flex-1 px-8 py-10 overflow-y-auto relative z-10 max-w-7xl mx-auto w-full">
        {/* Dynamic header row */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-8 border-b border-white/10 mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white uppercase">
              {activeTab === "dashboard" && "Dashboard Overview"}
              {activeTab === "leads" && "Leads Registry"}
              {activeTab === "analytics" && "Advanced Analytics Studio"}
              {activeTab === "timeline" && "Chronological Security Logs"}
              {activeTab === "settings" && "CRM Administration & Sync"}
            </h1>
            <p className="text-on-surface-variant text-xs mt-1 leading-relaxed">
              {activeTab === "dashboard" && "Real-time key metrics, conversion indices, and critical target states."}
              {activeTab === "leads" && "Full management of processed corporate Leads, statuses, schedules, and scores."}
              {activeTab === "analytics" && "Intelligent system funnels, telemetry metrics, and form interactions."}
              {activeTab === "timeline" && "Complete audit logs of lead submission steps, auth, and CRM modifications."}
              {activeTab === "settings" && "Google Sheets synchronization keys and notification pipeline integrations."}
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Quick sync display */}
            <button
              onClick={fetchCrmData}
              disabled={dataLoading}
              className="px-4 py-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl flex items-center gap-2 text-xs font-bold uppercase transition-all duration-300 tracking-wide text-white focus:outline-none hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${dataLoading ? "animate-spin text-brand-tertiary" : ""}`} />
              <span>Refresh intelligence</span>
            </button>
          </div>
        </header>

        {/* --- ERROR PANEL DISPLAYS --- */}
        {dataError && (
          <div className="flex gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-200 text-sm rounded-2xl mb-8 items-center">
            <AlertTriangle className="h-5 w-5 text-red-400 shrink-0" />
            <span>{dataError}</span>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB TERMINOLOGY: 1. DASHBOARD OVERVIEW */}
        {/* ===================================== */}
        {activeTab === "dashboard" && stats && (
          <div className="flex flex-col gap-10">
            {/* Quick stats KPI grids */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5">
              {/* Card 1 */}
              <div className="p-6 md:p-8 rounded-2xl glass-card border-brand-tertiary/10 relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-4 text-brand-tertiary/5 select-none text-5xl font-mono">
                  01
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-brand-tertiary uppercase">
                    Total Leads Received
                  </span>
                  <div className="text-3xl md:text-4xl font-extrabold text-white mt-2 font-mono group-hover:scale-105 transition-transform duration-300">
                    {stats.totalLeads}
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant/60 font-mono mt-4 uppercase">
                  ACTIVE DATABASE DOSSIERS
                </p>
              </div>

              {/* Card 2 */}
              <div className="p-6 md:p-8 rounded-2xl glass-card border-brand-secondary/10 relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-4 text-brand-secondary/5 select-none text-5xl font-mono">
                  02
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-brand-secondary uppercase">
                    Won Deals Closed
                  </span>
                  <div className="text-3xl md:text-4xl font-extrabold text-brand-secondary mt-2 font-mono group-hover:scale-105 transition-transform duration-300">
                    {stats.wonDeals}
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant/60 font-mono mt-4 uppercase">
                  CONVERSION WIN INDEX
                </p>
              </div>

              {/* Card 3 */}
              <div className="p-6 md:p-8 rounded-2xl glass-card border-brand-primary/10 relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-4 text-brand-primary/5 select-none text-5xl font-mono">
                  03
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-brand-primary uppercase">
                    Conversion Rate
                  </span>
                  <div className="text-3xl md:text-4xl font-extrabold text-[#00d9ff] mt-2 font-mono group-hover:scale-105 transition-transform duration-300">
                    {stats.conversionRate}%
                  </div>
                </div>
                <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-4">
                  <div
                    className="h-full bg-gradient-to-r from-brand-tertiary to-brand-secondary rounded-full"
                    style={{ width: `${stats.conversionRate}%` }}
                  ></div>
                </div>
              </div>

              {/* Card 4 */}
              <div className="p-6 md:p-8 rounded-2xl glass-card border-white/5 relative overflow-hidden flex flex-col justify-between group">
                <div className="absolute top-0 right-0 p-4 text-white/5 select-none text-5xl font-mono">
                  04
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-mono text-[9px] font-bold tracking-widest text-on-surface-variant uppercase">
                    High Intent Priority
                  </span>
                  <div className="text-3xl md:text-4xl font-extrabold text-[#d3ff9a] mt-2 font-mono group-hover:scale-105 transition-transform duration-300">
                    {stats.highPriorityLeads}
                  </div>
                </div>
                <p className="text-[10px] text-on-surface-variant/60 font-mono mt-4 uppercase">
                  SCORE &gt; 40 REGISTERED
                </p>
              </div>
            </div>

            {/* In-depth pipeline status breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Pipeline stages status list */}
              <div className="lg:col-span-7 glass-card p-6 md:p-8 rounded-3xl border-white/5 relative overflow-hidden">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-6">
                  Leads Pipeline Stage Distribution
                </h3>

                <div className="flex flex-col gap-4">
                  {/* Item 1 New Lead */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1.5">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-blue-500 rounded-lg"></span> New Lead
                      </span>
                      <span className="font-mono">{stats.newLeads} leads</span>
                    </div>
                    <div className="w-full bg-white/[0.03] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-500 rounded-full"
                        style={{ width: `${stats.totalLeads > 0 ? (stats.newLeads / stats.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Item 2 Contacted */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1.5">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-cyan-400 rounded-lg"></span> Contacted
                      </span>
                      <span className="font-mono">{stats.contactedLeads} leads</span>
                    </div>
                    <div className="w-full bg-white/[0.03] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full"
                        style={{ width: `${stats.totalLeads > 0 ? (stats.contactedLeads / stats.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Item 3 Discovery scheduled */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1.5">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-purple-500 rounded-lg"></span> Discovery Call Scheduled
                      </span>
                      <span className="font-mono">{stats.discoveryCallsScheduled} leads</span>
                    </div>
                    <div className="w-full bg-white/[0.03] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-purple-500 rounded-full"
                        style={{ width: `${stats.totalLeads > 0 ? (stats.discoveryCallsScheduled / stats.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Item 4 Proposal Sent */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1.5">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-orange-400 rounded-lg"></span> Proposal Sent
                      </span>
                      <span className="font-mono">{stats.proposalsSent} leads</span>
                    </div>
                    <div className="w-full bg-white/[0.03] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-orange-400 rounded-full"
                        style={{ width: `${stats.totalLeads > 0 ? (stats.proposalsSent / stats.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Item 5 Won */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1.5">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-[#d3ff9a] rounded-lg"></span> Won
                      </span>
                      <span className="font-mono">{stats.wonDeals} deals</span>
                    </div>
                    <div className="w-full bg-white/[0.03] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#d3ff9a] rounded-full animate-pulse"
                        style={{ width: `${stats.totalLeads > 0 ? (stats.wonDeals / stats.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>

                  {/* Item 6 Lost */}
                  <div>
                    <div className="flex justify-between items-center text-xs text-on-surface-variant mb-1.5">
                      <span className="font-medium text-white flex items-center gap-2">
                        <span className="w-2.5 h-2.5 bg-red-500 rounded-lg"></span> Lost
                      </span>
                      <span className="font-mono">{stats.lostDeals} deals</span>
                    </div>
                    <div className="w-full bg-white/[0.03] h-2.5 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-red-500 rounded-full"
                        style={{ width: `${stats.totalLeads > 0 ? (stats.lostDeals / stats.totalLeads) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Other indicators */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                {/* Secondary Indicators */}
                <div className="glass-card p-6 rounded-3xl border-white/5 relative overflow-hidden flex-1 flex flex-col justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Lead Qualification Telemetry
                  </h3>
                  <div className="flex items-center justify-around py-4 mt-2">
                    <div className="flex flex-col items-center">
                      <div className="text-lg font-mono font-black text-brand-tertiary">
                        {stats.averageLeadScore}
                      </div>
                      <span className="text-[9px] font-mono tracking-wider uppercase text-on-surface-variant/60 mt-1">
                        Avg Score
                      </span>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <div className="flex flex-col items-center">
                      <div className="text-lg font-mono font-black text-brand-secondary">
                        {leads.filter((l) => l.leadQuality === "High Intent").length}
                      </div>
                      <span className="text-[9px] font-mono tracking-wider uppercase text-on-surface-variant/60 mt-1">
                        High Intent
                      </span>
                    </div>
                    <div className="h-8 w-[1px] bg-white/10"></div>
                    <div className="flex flex-col items-center">
                      <div className="text-lg font-mono font-black text-on-surface-variant">
                        {leads.filter((l) => l.leadQuality === "Medium Intent").length}
                      </div>
                      <span className="text-[9px] font-mono tracking-wider uppercase text-on-surface-variant/60 mt-1">
                        Medium Intent
                      </span>
                    </div>
                  </div>
                </div>

                {/* Integration checklist block */}
                <div className="glass-card p-6 rounded-3xl border-white/5 relative overflow-hidden flex-1 flex flex-col justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                    Google Sheets CRM Connection
                  </h3>
                  <div className="mt-3">
                    <div className="flex items-center gap-2 text-xs">
                      <span className={`w-2.5 h-2.5 rounded-full ${spreadsheetId ? "bg-brand-secondary animate-pulse" : "bg-red-500"}`}></span>
                      <span className="text-white font-medium font-mono">
                        {spreadsheetId ? `Connected to Drive Sheet Registry` : "Drive Sheets Not Linked"}
                      </span>
                    </div>
                    <p className="text-[10px] text-on-surface-variant/70 mt-1.5 leading-relaxed font-sans">
                      {spreadsheetId
                        ? `Spreadsheet ID is verified on CRM settings`
                        : "Synchronize all dossiers and analytics records automatically inside Settings."}
                    </p>
                  </div>

                  <div className="mt-4 flex gap-2">
                    {spreadsheetId && (
                      <a
                        href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3.5 py-1.5 bg-brand-secondary/15 hover:bg-brand-secondary/25 border border-brand-secondary/30 rounded-xl text-[10px] font-bold uppercase text-brand-secondary hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 w-full text-center"
                      >
                        VIEW WORKBOOK
                      </a>
                    )}
                    <button
                      onClick={() => setActiveTab("settings")}
                      className="px-3.5 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl text-[10px] font-bold uppercase text-white hover:scale-[1.02] transition-all duration-300 w-full cursor-pointer"
                    >
                      CRM settings
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Activity Timeline list section */}
            <div className="glass-card p-6 md:p-8 rounded-3xl border-white/5 relative overflow-hidden">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                  Chronological Activity Overview (Recent Logs)
                </h3>
                <button
                  onClick={() => setActiveTab("timeline")}
                  className="text-xs font-mono font-bold text-brand-tertiary uppercase flex items-center gap-1 hover:underline cursor-pointer"
                >
                  <span>See full logs</span>
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              {timeline.length === 0 ? (
                <div className="text-center py-10 font-mono text-xs text-on-surface-variant/40">
                  NO CRM ACTION RECORDED IN STORAGE DISK
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  {timeline.slice(0, 5).map((log, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                    >
                      <div className="flex gap-3.5 items-start">
                        <div className="mt-1 flex items-center justify-center p-1 bg-brand-tertiary/10 border border-brand-tertiary/20 rounded-lg text-brand-tertiary">
                          <Clock className="h-3.5 w-3.5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white uppercase">{log.action}</span>
                            <span className="font-mono text-[10px] text-brand-secondary bg-brand-secondary/10 px-1.5 py-0.5 rounded">
                              {log.leadId}
                            </span>
                          </div>
                          <p className="text-on-surface-variant text-xs mt-1 leading-relaxed">
                            {log.details}
                          </p>
                        </div>
                      </div>
                      <span className="font-mono text-[9px] text-on-surface-variant/50 shrink-0 md:text-right">
                        {new Date(log.timestamp).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB TERMINOLOGY: 2. LEADS REGISTRY */}
        {/* ===================================== */}
        {activeTab === "leads" && (
          <div className="flex flex-col gap-6">
            {/* Filter controls row */}
            <div className="p-6 rounded-2xl bg-white/[0.02] border border-white/5 flex flex-col lg:flex-row gap-4 items-center justify-between relative z-10">
              <div className="relative w-full lg:max-w-md">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search lead name, company, email..."
                  className="w-full glass-input rounded-xl px-4 py-2.5 pl-11 text-white text-xs focus:outline-none placeholder-on-surface-variant/30"
                />
                <Search className="absolute top-1/2 left-4 -translate-y-1/2 h-4 w-4 text-on-surface-variant/40" />
              </div>

              <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                {/* Filter pipeline status */}
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-1.5">
                  <Filter className="h-3.5 w-3.5 text-on-surface-variant/60" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none focus:ring-0 leading-none cursor-pointer p-1"
                  >
                    <option value="all" className="bg-[#000c2c]">All Statuses</option>
                    <option value="New Lead" className="bg-[#000c2c]">New Lead</option>
                    <option value="Contacted" className="bg-[#000c2c]">Contacted</option>
                    <option value="Discovery Call Scheduled" className="bg-[#000c2c]">Discovery Scheduled</option>
                    <option value="Proposal Sent" className="bg-[#000c2c]">Proposal Sent</option>
                    <option value="Won" className="bg-[#000c2c]">Won Deal</option>
                    <option value="Lost" className="bg-[#000c2c]">Lost Deal</option>
                  </select>
                </div>

                {/* Filter intent quality */}
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-1.5">
                  <Star className="h-3.5 w-3.5 text-on-surface-variant/60" />
                  <select
                    value={qualityFilter}
                    onChange={(e) => setQualityFilter(e.target.value)}
                    className="bg-transparent text-white text-xs focus:outline-none focus:ring-0 leading-none cursor-pointer p-1"
                  >
                    <option value="all" className="bg-[#000c2c]">All Intent</option>
                    <option value="High Intent" className="bg-[#000c2c]">High Intent (41+)</option>
                    <option value="Medium Intent" className="bg-[#000c2c]">Medium Intent (21-40)</option>
                    <option value="Low Intent" className="bg-[#000c2c]">Low Intent (0-20)</option>
                  </select>
                </div>

                {/* Sorting options */}
                <div className="flex items-center gap-2 bg-white/[0.02] border border-white/5 rounded-xl px-3 py-1.5">
                  <Clock className="h-3.5 w-3.5 text-on-surface-variant/60" />
                  <select
                    value={`${sortField}-${sortOrder}`}
                    onChange={(e) => {
                      const [field, order] = e.target.value.split("-") as [any, any];
                      setSortField(field);
                      setSortOrder(order);
                    }}
                    className="bg-transparent text-white text-xs focus:outline-none focus:ring-0 leading-none cursor-pointer p-1"
                  >
                    <option value="timestamp-desc" className="bg-[#000c2c]">Newest First</option>
                    <option value="timestamp-asc" className="bg-[#000c2c]">Oldest First</option>
                    <option value="leadScore-desc" className="bg-[#000c2c]">Highest Score</option>
                    <option value="leadScore-asc" className="bg-[#000c2c]">Lowest Score</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Leads Table Container */}
            <div className="glass-card rounded-[2rem] border-white/10 overflow-hidden shadow-2xl bg-[#000924]/60">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-white/10 p-5 bg-white/[0.01]">
                      <th className="p-5 font-mono text-[10px] font-bold tracking-widest text-brand-tertiary uppercase">Lead ID</th>
                      <th className="p-5 font-mono text-[10px] font-bold tracking-widest text-brand-tertiary uppercase">Full Name</th>
                      <th className="p-5 font-mono text-[10px] font-bold tracking-widest text-brand-tertiary uppercase">Company</th>
                      <th className="p-5 font-mono text-[10px] font-bold tracking-widest text-brand-tertiary uppercase">Status</th>
                      <th className="p-5 font-mono text-[10px] font-bold tracking-widest text-brand-tertiary uppercase text-center">Score</th>
                      <th className="p-5 font-mono text-[10px] font-bold tracking-widest text-brand-tertiary uppercase text-right">Follow-Up</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-16 text-center font-mono text-xs text-on-surface-variant/40">
                          NO CORRESPONDING DOSSIER LEADS IN LOCAL DIRECTORY
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead, idx) => (
                        <tr
                          key={idx}
                          onClick={() => {
                            setSelectedLead(lead);
                            setEditNotes(lead.notes || "");
                            setEditFollowUp(lead.followUpDate || "");
                          }}
                          className="border-b border-white/5 hover:bg-white/[0.03] transition-colors duration-300 cursor-pointer text-xs"
                        >
                          <td className="p-5 font-bold font-mono text-white tracking-wide">
                            {lead.id}
                          </td>
                          <td className="p-5">
                            <div className="font-bold text-white text-sm">{lead.fullName}</div>
                            <div className="text-[10px] text-on-surface-variant/40 font-mono mt-0.5">{lead.businessEmail}</div>
                          </td>
                          <td className="p-5 font-medium text-on-surface">
                            {lead.companyName}
                          </td>
                          <td className="p-5">
                            <span
                              className={`px-3 py-1 bg-white/5 border rounded-full text-[10px] font-semibold tracking-wide uppercase ${
                                lead.leadStatus === "Won" && "bg-brand-secondary/10 border-brand-secondary/30 text-brand-secondary text-glow"
                              } ${
                                lead.leadStatus === "Lost" && "bg-red-500/10 border-red-500/30 text-red-200"
                              } ${
                                lead.leadStatus === "New Lead" && "bg-blue-500/10 border-blue-500/35 text-blue-300"
                              } ${
                                lead.leadStatus === "Contacted" && "bg-cyan-500/10 border-cyan-500/35 text-cyan-300"
                              } ${
                                lead.leadStatus === "Discovery Call Scheduled" && "bg-purple-500/10 border-purple-500/35 text-purple-300"
                              } ${
                                lead.leadStatus === "Proposal Sent" && "bg-orange-500/10 border-orange-500/35 text-orange-300"
                              }`}
                            >
                              {lead.leadStatus === "Won" ? "Won Deal" : lead.leadStatus === "Lost" ? "Lost" : lead.leadStatus}
                            </span>
                          </td>
                          <td className="p-5 text-center">
                            <span
                              className={`px-2.5 py-1 font-mono font-bold rounded-lg ${
                                lead.leadQuality === "High Intent"
                                  ? "bg-brand-secondary/10 text-brand-secondary"
                                  : lead.leadQuality === "Medium Intent"
                                  ? "bg-white/10 text-white"
                                  : "bg-white/5 text-on-surface-variant/40"
                              }`}
                            >
                              {lead.leadScore}
                            </span>
                          </td>
                          <td className="p-5 text-right font-mono text-on-surface-variant/80">
                            {lead.followUpDate || "---"}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Selected Lead Drawer/Modal Detail */}
        {selectedLead && (
          <div className="fixed inset-0 bg-[#000516]/80 backdrop-blur-md z-50 flex items-center justify-end">
            <div className="w-full max-w-2xl bg-[#001136] h-full border-l border-white/10 p-8 overflow-y-auto flex flex-col justify-between shadow-[0_0_50px_rgba(0,0,0,0.8)]">
              {/* Drawer Header */}
              <div className="flex justify-between items-start pb-6 border-b border-white/10 mb-6">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-brand-tertiary bg-brand-tertiary/10 px-2 py-0.5 rounded font-bold uppercase">
                      {selectedLead.id}
                    </span>
                    <span className="text-[10px] text-on-surface-variant/30 font-mono">
                      Received {new Date(selectedLead.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <h2 className="text-xl md:text-2xl font-bold text-white mt-2">
                    {selectedLead.fullName}
                  </h2>
                  <p className="text-on-surface-variant text-xs mt-1">
                    {selectedLead.companyName}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedLead(null)}
                  className="p-1 rounded-lg bg-white/5 border border-white/10 text-on-surface-variant hover:text-white hover:bg-white/15 cursor-pointer transition-all duration-300"
                >
                  <XIcon className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Fields Body */}
              <div className="flex-1 flex flex-col gap-6">
                {/* 2 Grid cards */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Lead Score indicator */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="font-mono text-[9px] tracking-widest text-[#00d9ff] uppercase font-bold">
                      Lead Score Breakdown
                    </span>
                    <div className="flex items-baseline gap-2 mt-2">
                      <span className="text-3xl font-extrabold font-mono text-white">
                        {selectedLead.leadScore}
                      </span>
                      <span className={`text-[10px] font-bold uppercase font-mono ${selectedLead.leadQuality === "High Intent" ? "text-brand-secondary" : "text-on-surface-variant"}`}>
                        ({selectedLead.leadQuality})
                      </span>
                    </div>

                    <div className="mt-2.5 flex flex-col gap-1 text-[9px] font-mono text-on-surface-variant/70 leading-normal border-t border-white/5 pt-2">
                      <div className="flex justify-between">
                        <span>Company provided</span>
                        <span className="text-brand-secondary">+10</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Email provided</span>
                        <span className="text-brand-secondary">+10</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Message &gt; 50 chars</span>
                        <span className="text-brand-secondary">{selectedLead.message.length > 50 ? "+10" : "0"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Message &gt; 150 chars</span>
                        <span className="text-brand-secondary">{selectedLead.message.length > 150 ? "+20" : "0"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Operational Detail */}
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[9px] tracking-widest text-brand-secondary uppercase font-bold">
                        Corporate Contact
                      </span>
                      <p className="text-xs font-bold text-white mt-2 truncate">
                        {selectedLead.businessEmail}
                      </p>
                    </div>

                    <div className="border-t border-white/5 pt-2 mt-2 text-[9px] font-mono text-on-surface-variant/60 uppercase">
                      <div><b>Source page:</b> {selectedLead.sourcePage}</div>
                      <div className="mt-1"><b>Last Updated:</b> {new Date(selectedLead.lastUpdated).toLocaleDateString()}</div>
                    </div>
                  </div>
                </div>

                {/* Submited Message */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5">
                  <h4 className="font-bold text-xs tracking-wide text-white uppercase flex items-center gap-2">
                    <Mail className="h-4 w-4 text-brand-tertiary" />
                    Strategic message details
                  </h4>
                  <p className="text-on-surface-variant text-xs mt-3 leading-relaxed italic bg-white/[0.01] p-3 rounded-lg border border-white/5">
                    "{selectedLead.message}"
                  </p>
                </div>

                {/* Sales Quick Actions */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-3">
                  <h4 className="font-bold text-xs tracking-wide text-white uppercase flex items-center gap-2 font-sans">
                    <Sparkles className="h-4 w-4 text-brand-tertiary" />
                    Sales Quick Actions
                  </h4>
                  <div className="grid grid-cols-2 gap-3 mt-1">
                    <button
                      onClick={() => {
                        alert("Since phone number was not collected in the complimentary intake form, you can review corporate company notes or email the business directly.");
                      }}
                      className="px-4 py-2.5 rounded-lg bg-brand-primary/10 border border-brand-primary/25 hover:bg-brand-primary/20 text-brand-primary text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                    >
                      <span>📞 Call Lead</span>
                    </button>
                    <a
                      href={`mailto:${selectedLead.businessEmail}?subject=RE: Core Solution AI Strategy Session Enquiry [${selectedLead.id}]&body=Hello ${selectedLead.fullName.split(" ")[0] || selectedLead.fullName},%0D%0A%0D%0AThank you for contacting Core Solution. This is regarding your complimentary intake session enquiry (ID: ${selectedLead.id}).`}
                      className="px-4 py-2.5 rounded-lg bg-brand-secondary/10 border border-brand-secondary/25 hover:bg-brand-secondary/20 text-brand-secondary text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 text-center"
                    >
                      <span>✉️ Send Email</span>
                    </a>
                    <button
                      onClick={() => {
                        alert(`You are already in the CRM dashboard view of Lead Reference ${selectedLead.id}.`);
                      }}
                      className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 cursor-pointer"
                    >
                      <span>💼 Open CRM</span>
                    </button>
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `🚀 NEW LEAD RECEIVED\n\nLead ID: ${selectedLead.id}\nName: ${selectedLead.fullName}\nCompany: ${selectedLead.companyName}\nEmail: ${selectedLead.businessEmail}\nLead Score: ${selectedLead.leadScore}\nLead Quality: ${selectedLead.leadQuality}\nSource: ${selectedLead.sourcePage}\nSubmitted: ${new Date(selectedLead.timestamp).toLocaleString()}\n\nMessage:\n${selectedLead.message}`
                      )}`}
                      target="_blank"
                      rel="noreferrer referrer"
                      className="px-4 py-2.5 rounded-lg bg-brand-tertiary/10 border border-brand-tertiary/25 hover:bg-brand-tertiary/20 text-brand-tertiary text-xs font-semibold flex items-center justify-center gap-2 transition-all duration-300 text-center"
                    >
                      <span>💬 Share / WhatsApp Alert</span>
                    </a>
                  </div>
                </div>

                {/* Admin Update controller settings */}
                <div className="p-5 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col gap-4">
                  <h4 className="font-bold text-xs tracking-wide text-white uppercase flex items-center gap-2">
                    <Sliders className="h-4 w-4 text-brand-secondary" />
                    Dossier Administrative Actions
                  </h4>

                  {/* Pipeline state selector */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] font-bold text-on-surface-variant/50 uppercase">
                      Update pipeline status
                    </label>
                    <div className="bg-[#000c2c] border border-white/10 rounded-xl relative">
                      <select
                        value={selectedLead.leadStatus}
                        disabled={updatingLeadField}
                        onChange={(e) => handleUpdateLeadField(selectedLead.id, "leadStatus", e.target.value)}
                        className="w-full bg-transparent text-white text-xs px-4 py-3 focus:outline-none focus:ring-0 leading-none cursor-pointer appearance-none"
                      >
                        <option value="New Lead">New Lead</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Discovery Call Scheduled">Discovery Call Scheduled</option>
                        <option value="Proposal Sent">Proposal Sent</option>
                        <option value="Won">Won Deal (Convert)</option>
                        <option value="Lost">Lost Deal</option>
                      </select>
                      <ChevronDown className="absolute top-1/2 right-4 -translate-y-1/2 h-4 w-4 text-on-surface-variant pointer-events-none" />
                    </div>
                  </div>

                  {/* Follow up schedulings */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] font-bold text-on-surface-variant/50 uppercase">
                      Follow up schedule date
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={editFollowUp}
                        disabled={updatingLeadField}
                        onChange={(e) => setEditFollowUp(e.target.value)}
                        className="w-full bg-[#000c2c] border border-white/15 rounded-xl px-4 py-3 text-white text-xs focus:on-surface"
                      />
                      <button
                        onClick={() => handleUpdateLeadField(selectedLead.id, "followUpDate", editFollowUp)}
                        disabled={updatingLeadField}
                        className="px-4 bg-brand-secondary text-[#001136] font-bold text-xs rounded-xl focus:outline-none hover:bg-brand-secondary/[0.8] cursor-pointer"
                      >
                        SAVE
                      </button>
                    </div>
                  </div>

                  {/* Admin notes typing */}
                  <div className="flex flex-col gap-1.5">
                    <label className="font-mono text-[10px] font-bold text-on-surface-variant/50 uppercase">
                      Internal Management Notes
                    </label>
                    <textarea
                      rows={3}
                      value={editNotes}
                      disabled={updatingLeadField}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Enter status briefings, proposal details, meeting links..."
                      className="w-full bg-[#000c2c] border border-white/15 rounded-xl px-4 py-3 text-white text-xs focus:on-surface placeholder-on-surface-variant/20"
                    ></textarea>
                    <button
                      onClick={() => handleUpdateLeadField(selectedLead.id, "notes", editNotes)}
                      disabled={updatingLeadField}
                      className="py-2.5 bg-brand-tertiary text-[#001136] font-bold text-xs tracking-wider uppercase rounded-xl hover:bg-brand-tertiary/[0.8] cursor-pointer"
                    >
                      SAVE CRITICAL BRIEFING NOTES
                    </button>
                  </div>
                </div>
              </div>

              {/* Modal footer closeness */}
              <div className="mt-8 border-t border-white/10 pt-5 text-center">
                <button
                  onClick={() => setSelectedLead(null)}
                  className="font-mono text-xs text-on-surface-variant hover:text-white uppercase tracking-wider underline cursor-pointer"
                >
                  DISMISS LEAD CARD
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB TERMINOLOGY: 3. ADVANCED ANALYTICS */}
        {/* ===================================== */}
        {activeTab === "analytics" && stats && (
          <div className="flex flex-col gap-10">
            {/* Conversion analytics funnel and telemetry data */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Glass container metrics for telemetry starts/submits */}
              <div className="lg:col-span-5 flex flex-col gap-5">
                <div className="p-6 rounded-3xl glass-card border-white/5 relative overflow-hidden flex-1 flex flex-col justify-between">
                  <div>
                    <span className="font-mono text-[9px] tracking-widest text-[#00d9ff] uppercase font-bold">
                      Interaction conversion funnel
                    </span>
                    <h3 className="text-xl font-extrabold text-white mt-1 uppercase">
                      Intake telemetry rates
                    </h3>
                  </div>

                  <div className="flex flex-col gap-4.5 mt-5">
                    {/* views */}
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-on-surface-variant">Form Views Total</span>
                      <span className="font-mono font-bold text-white">{stats.rawAnalytics.form_views}</span>
                    </div>

                    {/* starts */}
                    <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                      <span className="text-on-surface-variant">Form Starts (Typing initiated)</span>
                      <span className="font-mono font-bold text-white">
                        {stats.rawAnalytics.form_starts}
                        <span className="text-[10px] text-on-surface-variant/40 ml-1">
                          ({stats.rawAnalytics.form_views > 0 ? Math.round((stats.rawAnalytics.form_starts / stats.rawAnalytics.form_views) * 100) : 0}% activation)
                        </span>
                      </span>
                    </div>

                    {/* submissions */}
                    <div className="flex justify-between items-center text-xs border-b border-[#fff]/5 pb-2">
                      <span className="text-on-surface-variant">Intake Submissions</span>
                      <span className="font-mono font-bold text-white">
                        {stats.rawAnalytics.form_submissions}
                      </span>
                    </div>

                    {/* successes */}
                    <div className="flex justify-between items-center text-xs border-b border-white/10 pb-3">
                      <span className="text-white font-bold flex items-center gap-1.5">
                        <CheckCircle2 className="h-4 w-4 text-brand-secondary" /> CRM Saved Leads
                      </span>
                      <span className="font-mono font-bold text-brand-secondary">
                        {stats.rawAnalytics.successful_leads}
                      </span>
                    </div>
                  </div>

                  {/* calculations segment */}
                  <div className="mt-4 p-4 rounded-xl bg-brand-tertiary/5 border border-brand-tertiary/20 flex justify-between items-center">
                    <div>
                      <span className="text-[9px] font-mono tracking-wider uppercase text-on-surface-variant">
                        Submission Ratio
                      </span>
                      <div className="text-2xl font-mono font-black text-white mt-1">
                        {stats.rawAnalytics.conversionRate}%
                      </div>
                    </div>
                    <span className="text-[9px] font-mono text-on-surface-variant/50 max-w-[150px] text-right leading-relaxed block uppercase">
                      Submissions per total view index value
                    </span>
                  </div>
                </div>
              </div>

              {/* Graphic Vector conversion funnel (funnel visual bars) */}
              <div className="lg:col-span-7 p-6 rounded-3xl glass-card border-white/5 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-4">
                    Visual conversion pipeline funnel
                  </h3>
                  <p className="text-[10px] font-mono text-on-surface-variant/50 uppercase leading-snug">
                    Loss indicators across critical form interaction steps
                  </p>
                </div>

                {/* Drawn funnel using styled divs with staggered narrowing columns */}
                <div className="flex flex-col gap-3 mt-6">
                  {/* Step 1 views */}
                  <div className="flex items-center gap-3">
                    <span className="w-24 font-mono text-[9px] tracking-wider uppercase text-on-surface-variant/70 shrink-0">1. views</span>
                    <div className="flex-1 bg-white/[0.02] h-10 rounded-lg overflow-hidden border border-white/5 font-mono text-xs flex items-center px-4 justify-between bg-gradient-to-r from-brand-tertiary/20 to-brand-tertiary/5">
                      <div className="h-full bg-brand-tertiary/30 rounded-lg font-bold text-white flex items-center px-4 w-full justify-between">
                        <span>VIEWS AT PAGE</span>
                        <span>{stats.rawAnalytics.form_views}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 2 starts */}
                  <div className="flex items-center gap-3">
                    <span className="w-24 font-mono text-[9px] tracking-wider uppercase text-on-surface-variant/70 shrink-0">2. starts</span>
                    <div className="flex-1 bg-white/[0.02] h-10 rounded-lg overflow-hidden border border-white/5 font-mono text-xs flex items-center px-4 justify-between bg-gradient-to-r from-brand-primary/20 to-brand-primary/5 max-w-[90%]">
                      <div className="h-full bg-brand-primary/20 rounded-lg font-bold text-white flex items-center px-4 w-full justify-between">
                        <span>TYPING COMMENCED</span>
                        <span>{stats.rawAnalytics.form_starts}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 3 submits */}
                  <div className="flex items-center gap-3">
                    <span className="w-24 font-mono text-[9px] tracking-wider uppercase text-on-surface-variant/70 shrink-0">3. submits</span>
                    <div className="flex-1 bg-white/[0.02] h-10 rounded-lg overflow-hidden border border-white/5 font-mono text-xs flex items-center px-4 justify-between bg-gradient-to-r from-brand-secondary/20 to-brand-secondary/5 max-w-[70%]">
                      <div className="h-full bg-brand-secondary/15 rounded-lg font-bold text-white flex items-center px-4 w-full justify-between">
                        <span>SUBMISSIONS</span>
                        <span>{stats.rawAnalytics.form_submissions}</span>
                      </div>
                    </div>
                  </div>

                  {/* Step 4 conversion */}
                  <div className="flex items-center gap-3">
                    <span className="w-24 font-mono text-[9px] tracking-wider uppercase text-on-surface-variant/70 shrink-0">4. won deals</span>
                    <div className="flex-1 bg-white/[0.02] h-10 rounded-lg overflow-hidden border border-white/5 font-mono text-xs flex items-center px-4 justify-between bg-gradient-to-r from-brand-secondary/40 to-transparent max-w-[50%] shadow-[0_0_15px_rgba(211,255,154,0.1)] border-brand-secondary/20">
                      <div className="h-full rounded-lg font-bold text-brand-secondary flex items-center px-4 w-full justify-between">
                        <span>DEALS WON</span>
                        <span>{stats.wonDeals}</span>
                      </div>
                    </div>
                  </div>
                </div>

                <p className="text-[10px] text-on-surface-variant/50 italic mt-6 leading-relaxed">
                  Tip: A high drop-off between starts and submissions implies either form friction (the message block is too long) or pricing layout ambiguities on the home interface.
                </p>
              </div>
            </div>

            {/* Monthly Trend analytics block */}
            <div className="p-6 md:p-8 rounded-3xl glass-card border-white/5">
              <h3 className="text-sm font-bold uppercase tracking-wider text-white mb-2">
                Leads Capturing Volumetric Trends
              </h3>
              <p className="text-[10px] font-mono text-on-surface-variant/40 uppercase leading-snug">
                Chronological monthly metrics captured through strategic form integrations
              </p>

              {/* drawn charts bars using month dataset */}
              <div className="mt-8 flex items-end justify-between gap-4 h-48 border-b border-l border-white/10 p-4">
                {Object.keys(stats.monthlyLeads).length === 0 ? (
                  <div className="w-full text-center font-mono text-xs text-on-surface-variant/30 py-16">
                    NO VOLUME PROFILE RECORDED FOR CORRESPONDED TIMESTAMPS
                  </div>
                ) : (
                  Object.entries(stats.monthlyLeads).map(([month, count], key) => {
                    const maxVal = Math.max(...(Object.values(stats.monthlyLeads) as number[]), 1);
                    const pct = ((count as number) / maxVal) * 100;
                    return (
                      <div key={key} className="flex-1 flex flex-col items-center gap-2 group">
                        <span className="font-mono text-[9px] text-[#00d9ff] opacity-0 group-hover:opacity-100 transition-opacity duration-300 font-bold">
                          {count} leads
                        </span>
                        <div
                          className="w-full max-w-[40px] bg-gradient-to-t from-brand-surface-bright/20 via-brand-tertiary/40 to-[#00d9ff] rounded-lg transition-all duration-500 shadow-[0_0_15px_rgba(0,217,255,0.15)] group-hover:shadow-[0_0_25px_rgba(0,217,255,0.3)] hover:scale-105"
                          style={{ height: `${Math.max(pct, 10)}%` }}
                        ></div>
                        <span className="font-mono text-[9px] text-on-surface-variant/70 tracking-tighter uppercase shrink-0 mt-1">
                          {month}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}

        {/* ===================================== */}
        {/* TAB TERMINOLOGY: 4. ACTIVITY TIMELINE LOGGER */}
        {/* ===================================== */}
        {activeTab === "timeline" && (
          <div className="glass-card p-6 md:p-10 rounded-[2rem] border-white/5 relative overflow-hidden">
            {timeline.length === 0 ? (
              <div className="text-center py-20 font-mono text-xs text-on-surface-variant/40">
                DATABASE DISK STORAGE EMPTY - NO ACTION REGISTRIES REPORTED
              </div>
            ) : (
              <div className="relative pl-6 border-l border-white/10 flex flex-col gap-8 md:gap-10">
                {timeline.map((log, key) => (
                  <div key={key} className="relative group">
                    {/* Glowing side neon anchor bullet */}
                    <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-2 border-brand-tertiary bg-[#001136] group-hover:bg-brand-tertiary group-hover:scale-110 transition-all duration-300 shadow-[0_0_10px_rgba(0,217,255,0.4)]"></div>

                    <div className="p-5 rounded-2xl bg-white/[0.015] border border-white/5 hover:border-brand-tertiary/20 hover:bg-white/[0.03] transition-all duration-300">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-bold text-white uppercase tracking-wider">
                            {log.action}
                          </span>
                          <span className="font-mono text-[10px] text-brand-secondary bg-brand-secondary/10 px-2 py-0.5 rounded-md">
                            {log.leadId}
                          </span>
                        </div>
                        <span className="font-mono text-[10px] text-on-surface-variant/50">
                          {new Date(log.timestamp).toLocaleString()}
                        </span>
                      </div>

                      <p className="text-on-surface-variant text-xs mt-2 leading-relaxed">
                        {log.details}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================================== */}
        {/* TAB TERMINOLOGY: 5. CRM SETTINGS & GOOGLE SYNC */}
        {/* ===================================== */}
        {activeTab === "settings" && (
          <div className="flex flex-col gap-10">
            {/* Google Sheets syncing segment */}
            <div className="p-6 md:p-10 rounded-3xl glass-card border-white/5 relative overflow-hidden bg-gradient-to-br from-brand-surface-dim to-brand-surface/40">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10 mb-8">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-white/[0.03] border border-white/5 rounded-2xl text-brand-secondary">
                    <FileSpreadsheet className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white uppercase font-sans">
                      Verify Sheets CRM synchronization
                    </h2>
                    <p className="text-on-surface-variant text-xs mt-1">
                      Link and authenticate your Google account to authorize instant Writes to Sheets and send notification emails.
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleGoogleAuth}
                  disabled={googleSyncing}
                  className="px-5 py-3 rounded-xl bg-brand-secondary hover:bg-brand-secondary/80 text-[#001136] font-bold text-xs tracking-wider uppercase flex items-center gap-2 shadow-lg hover:shadow-[0_0_20px_rgba(211,255,154,0.3)] transition-all duration-300 disabled:opacity-40 cursor-pointer"
                >
                  <RefreshCw className={`h-4 w-4 ${googleSyncing ? "animate-spin" : ""}`} />
                  <span>{spreadsheetId ? "RE-AUTHORIZE ACCOUNT" : "CONNECT GOOGLE ACCOUNT"}</span>
                </button>
              </div>

              {/* Status details segment */}
              <div className="flex flex-col gap-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                    <span className="font-mono text-[9px] tracking-widest text-[#00d9ff] uppercase block font-bold mb-2">
                      Connected Google Sheet Name
                    </span>
                    <p className="font-bold whitespace-nowrap text-white text-sm">
                      Core Solution CRM
                    </p>
                    <p className="text-[10px] text-on-surface-variant/40 font-mono mt-1 leading-relaxed">
                      Saves to Workbook under strategic tabs: Leads, Dashboard, Activity Timeline.
                    </p>
                  </div>

                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[9px] tracking-widest text-brand-secondary uppercase block font-bold">
                        Workbook Sheets Schema
                      </span>
                      <div className="flex gap-1.5 mt-2 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[9px] text-[#00d9ff]">Tabs: Leads</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[9px] text-brand-secondary">Tabs: Dashboard</span>
                        <span className="px-1.5 py-0.5 rounded bg-white/5 font-mono text-[9px] text-purple-300">Tabs: Activity Timeline</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Spreadsheet ID displays */}
                {spreadsheetId && (
                  <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3 font-mono text-xs text-on-surface-variant">
                    <div className="truncate">
                      <b>Spreadsheet ID:</b> <span className="text-white bg-white/5 px-2 py-1 rounded ml-1 select-all">{spreadsheetId}</span>
                    </div>
                    <a
                      href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-brand-tertiary flex items-center gap-1.5 hover:underline uppercase text-[9px] font-bold tracking-wider"
                    >
                      <span>Open spreadsheet workbook</span>
                      <ChevronRight className="h-4.5 w-4.5" />
                    </a>
                  </div>
                )}

                {/* Console logs */}
                {syncStatusMsg && (
                  <div className="p-4 bg-brand-tertiary/10 border border-brand-tertiary/20 text-brand-tertiary text-xs rounded-xl font-mono leading-relaxed">
                    <b>Sync Terminal Log:</b><br />
                    <span className="text-white mt-1.5 block">{syncStatusMsg}</span>
                  </div>
                )}

                {/* Force sync buttons */}
                {spreadsheetId && (
                  <div className="mt-4 border-t border-white/10 pt-6 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <p className="text-[10px] text-on-surface-variant/60 max-w-lg leading-relaxed font-sans">
                      Dossier leads queue up locally when offline. Triggering a manual synchronization force pushes all row updates, metrics columns, and security records immediately to Google Sheets.
                    </p>
                    <button
                      onClick={handleForceSync}
                      disabled={googleSyncing}
                      className="px-6 py-3 shrink-0 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 font-bold font-mono text-xs tracking-wider uppercase flex items-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all duration-350 cursor-pointer"
                    >
                      <RefreshCw className={`h-4 w-4 ${googleSyncing ? "animate-spin" : ""}`} />
                      <span>MANUALLY TRIGGER CRM SYNC</span>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Architecture Integrations Section (WhatsApp, HubSpot, Salesforce, Pipedrive placeholders) */}
            <div className="p-6 md:p-10 rounded-3xl glass-card border-white/5 relative overflow-hidden bg-[#000924]/50">
              <h2 className="text-lg font-bold text-white uppercase font-sans mb-1.5">
                Future-Ready Strategic Adapters
              </h2>
              <p className="text-on-surface-variant text-xs mb-8">
                Pre-compiled operational hooks ready to expand your workflow parameters. Click to configure credentials.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 font-mono text-xs text-on-surface-variant/40">
                {/* Integration 1 */}
                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand-tertiary/20 hover:bg-white/[0.02] hover:text-white transition-all duration-300 cursor-not-allowed">
                  <h4 className="font-bold text-white/50 text-[11px] tracking-wide uppercase">WhatsApp Business API</h4>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1 uppercase">Operational hook: Ready</p>
                  <span className="text-[9px] text-[#00d9ff] font-bold block mt-3 uppercase tracking-widest">CONNECT ADAPTER</span>
                </div>

                {/* Integration 2 */}
                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand-tertiary/20 hover:bg-white/[0.02] hover:text-white transition-all duration-300 cursor-not-allowed">
                  <h4 className="font-bold text-white/50 text-[11px] tracking-wide uppercase">HubSpot Integration</h4>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1 uppercase">Operational hook: Ready</p>
                  <span className="text-[9px] text-[#00d9ff] font-bold block mt-3 uppercase tracking-widest">CONNECT ADAPTER</span>
                </div>

                {/* Integration 3 */}
                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand-tertiary/20 hover:bg-white/[0.02] hover:text-white transition-all duration-300 cursor-not-allowed">
                  <h4 className="font-bold text-white/50 text-[11px] tracking-wide uppercase">Salesforce CRM</h4>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1 uppercase">Operational hook: Ready</p>
                  <span className="text-[9px] text-[#00d9ff] font-bold block mt-3 uppercase tracking-widest">CONNECT ADAPTER</span>
                </div>

                {/* Integration 4 */}
                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand-tertiary/20 hover:bg-white/[0.02] hover:text-white transition-all duration-300 cursor-not-allowed">
                  <h4 className="font-bold text-white/50 text-[11px] tracking-wide uppercase">Zoho CRM Suite</h4>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1 uppercase">Operational hook: Ready</p>
                  <span className="text-[9px] text-[#00d9ff] font-bold block mt-3 uppercase tracking-widest">CONNECT ADAPTER</span>
                </div>

                {/* Integration 5 */}
                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand-tertiary/20 hover:bg-white/[0.02] hover:text-white transition-all duration-300 cursor-not-allowed">
                  <h4 className="font-bold text-white/50 text-[11px] tracking-wide uppercase">Pipedrive Adapter</h4>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1 uppercase">Operational hook: Ready</p>
                  <span className="text-[9px] text-[#00d9ff] font-bold block mt-3 uppercase tracking-widest">CONNECT ADAPTER</span>
                </div>

                {/* Integration 6 */}
                <div className="p-5 rounded-xl border border-white/5 bg-white/[0.01] hover:border-brand-tertiary/20 hover:bg-white/[0.02] hover:text-white transition-all duration-300 cursor-not-allowed">
                  <h4 className="font-bold text-white/50 text-[11px] tracking-wide uppercase">Calendly Scheduler</h4>
                  <p className="text-[9px] text-on-surface-variant/50 mt-1 uppercase">Operational hook: Ready</p>
                  <span className="text-[9px] text-[#00d9ff] font-bold block mt-3 uppercase tracking-widest">CONNECT ADAPTER</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
