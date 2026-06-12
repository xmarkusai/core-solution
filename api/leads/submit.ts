import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
try {
return res.status(200).json({
smtpHost: process.env.SMTP_HOST || "MISSING",
smtpUser: process.env.SMTP_USER || "MISSING",
smtpFrom: process.env.SMTP_FROM || "MISSING",
googleScriptUrl: process.env.GOOGLE_SCRIPT_URL || "MISSING"
});
} catch (error: any) {
return res.status(500).json({
error: error?.message || String(error)
});
}
}
