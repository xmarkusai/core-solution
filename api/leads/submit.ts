export default async function handler(req: any, res: any) {
return res.status(200).json({
success: true,
smtpHost: process.env.SMTP_HOST,
smtpUser: process.env.SMTP_USER,
smtpFrom: process.env.SMTP_FROM,
googleScriptUrl: process.env.GOOGLE_SCRIPT_URL
});
}
