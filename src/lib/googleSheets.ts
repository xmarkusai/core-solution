import crypto from "node:crypto";

interface LeadData {
  timestamp: string;
  id: string;
  fullName: string;
  companyName: string;
  businessEmail: string;
  message: string;
  sourcePage: string;
  leadStatus: string;
  leadScore: number;
  leadQuality: string;
  lastUpdated: string;
  followUpDate: string;
  notes: string;
}

/**
 * Signs a JWT assertion for Google Service Account OAuth 2.0.
 */
function signJwtAssertion(clientEmail: string, privateKey: string, scope: string): string {
  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const now = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: clientEmail,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = Buffer.from(JSON.stringify(header)).toString("base64url");
  const encodedClaimSet = Buffer.from(JSON.stringify(claimSet)).toString("base64url");
  const payload = `${encodedHeader}.${encodedClaimSet}`;

  // Make sure private key format has correct newlines
  const formattedKey = privateKey.replace(/\\n/g, "\n");

  const sign = crypto.createSign("RSA-SHA256");
  sign.update(payload);
  const signature = sign.sign(formattedKey, "base64url");

  return `${payload}.${signature}`;
}

/**
 * Retrieves the OAuth 2.0 access token via Service Account JWT.
 */
async function getServiceAccountAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const scope = "https://www.googleapis.com/auth/spreadsheets";
  const assertion = signJwtAssertion(clientEmail, privateKey, scope);

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: assertion,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Google OAuth error: ${errorBody}`);
  }

  const data = await response.json();
  return data.access_token;
}

/**
 * Parsed Google Credentials from environment variables.
 */
function getGoogleCredentials() {
  let spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID || "";
  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL || "";
  let privateKey = process.env.GOOGLE_PRIVATE_KEY || "";

  // Attempt to parse Service Account JSON if provided
  const credentialsJsonStr = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
  if (credentialsJsonStr) {
    try {
      const creds = JSON.parse(credentialsJsonStr);
      if (creds.client_email) clientEmail = creds.client_email;
      if (creds.private_key) privateKey = creds.private_key;
      if (creds.spreadsheet_id) spreadsheetId = creds.spreadsheet_id; // optional fallback
    } catch (e: any) {
      console.error("Failed to parse GOOGLE_SERVICE_ACCOUNT_CREDENTIALS as JSON:", e.message);
    }
  }

  return {
    spreadsheetId,
    clientEmail,
    privateKey,
  };
}

/**
 * Checks if the necessary credentials are set in the environment.
 */
export function isGoogleSheetsConfigured(): boolean {
  const { spreadsheetId, clientEmail, privateKey } = getGoogleCredentials();
  return Boolean(spreadsheetId && clientEmail && privateKey);
}

/**
 * Ensures the Google Sheets 'Leads' worksheet exists, and maps its headers if created.
 */
async function ensureLeadsSheetExists(accessToken: string, spreadsheetId: string): Promise<void> {
  const metaUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties.title`;
  const res = await fetch(metaUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    const errorBody = await res.text();
    if (res.status === 403) {
      throw new Error("PERMISSION_DENIED");
    }
    throw new Error(`Failed to fetch spreadsheet metadata: ${errorBody}`);
  }

  const meta = await res.json();
  const sheets = meta.sheets || [];
  const hasLeads = sheets.some((s: any) => s.properties?.title === "Leads");

  if (!hasLeads) {
    console.log("Sheet 'Leads' not found. Creating 'Leads' worksheet...");
    const createRes = await fetch(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        requests: [
          {
            addSheet: {
              properties: {
                title: "Leads",
              },
            },
          },
        ],
      }),
    });

    if (!createRes.ok) {
      const errText = await createRes.text();
      throw new Error(`Failed to create 'Leads' worksheet: ${errText}`);
    }

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

    const headerRes = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Leads!A1:M1?valueInputOption=RAW`,
      {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ values: [leadsHeaders] }),
      }
    );

    if (!headerRes.ok) {
      console.warn("Successfully created 'Leads' sheet, but failed to write headers:", await headerRes.text());
    } else {
      console.log("Successfully created 'Leads' sheet with correct headers.");
    }
  }
}

/**
 * Pushes a new lead submission directly to the 'Leads' worksheet.
 */
export async function pushLeadToGoogleSheets(lead: LeadData): Promise<boolean> {
  const { spreadsheetId, clientEmail, privateKey } = getGoogleCredentials();

  if (!spreadsheetId || !clientEmail || !privateKey) {
    console.warn("Google Sheets Service Account sync skipped: Environment variables are not fully configured.");
    return false;
  }

  try {
    const accessToken = await getServiceAccountAccessToken(clientEmail, privateKey);

    // Make sure 'Leads' sheet exists in the workbook
    try {
      await ensureLeadsSheetExists(accessToken, spreadsheetId);
    } catch (e: any) {
      if (e.message === "PERMISSION_DENIED") {
        throw new Error(
          `Permission Denied. Please ensure that you have shared your Google Spreadsheet with the service account client email: "${clientEmail}" as an 'Editor'.`
        );
      }
      throw e;
    }

    // Adhere to required CRM columns:
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

    // Append to "Leads" sheet
    const range = "Leads!A1";
    const appendUrl = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${range}:append?valueInputOption=RAW&insertDataOption=INSERT_ROWS`;

    const response = await fetch(appendUrl, {
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

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 403) {
        throw new Error(
          `Permission Denied on Append. Please ensure that you have shared your Google Spreadsheet with the service account client email: "${clientEmail}" as an 'Editor'.`
        );
      }
      throw new Error(`Google Sheets API write failed: ${errText}`);
    }

    console.log(`Lead ${lead.id} successfully synchronized to Google Sheets via Service Account credentials.`);
    return true;
  } catch (error: any) {
    console.error("Failed to push lead to Google Sheets via Service Account:", error.message);
    return false;
  }
}
