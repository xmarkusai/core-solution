export interface LeadData {
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

export function isGoogleSheetsConfigured(): boolean {
return false;
}

export async function pushLeadToGoogleSheets(
lead: LeadData
): Promise<boolean> {
console.log("Google Sheets disabled", lead);
return true;
}
