import nodemailer from "nodemailer";
import { pushLeadToGoogleSheets } from "../../src/lib/googleSheets";

export default async function handler(req: any, res: any) {
if (req.method !== "POST") {
return res.status(405).json({
error: "Method not allowed"
});
}

const {
fullName,
companyName,
businessEmail,
message
} = req.body;

if (!fullName || !companyName || !businessEmail || !message) {
return res.status(400).json({
error: "Required fields are missing"
});
}

try {
const transporter = nodemailer.createTransport({
host: process.env.SMTP_HOST,
port: Number(process.env.SMTP_PORT),
secure: false,
auth: {
user: process.env.SMTP_USER,
pass: process.env.SMTP_PASS
}
});

```
// Internal notification
await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: "Markus@coresolution.my",
  subject: `New Lead - ${companyName}`,
  html: `
    <h2>New Lead Received</h2>
    <p><strong>Name:</strong> ${fullName}</p>
    <p><strong>Company:</strong> ${companyName}</p>
    <p><strong>Email:</strong> ${businessEmail}</p>
    <p><strong>Message:</strong></p>
    <p>${message}</p>
  `
});

// Auto response
await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: businessEmail,
  subject: "Thank you for contacting Core Solution",
  html: `
    <h2>Thank You</h2>
    <p>Hi ${fullName},</p>
    <p>Thank you for contacting Core Solution.</p>
    <p>We have received your enquiry and our team will contact you shortly.</p>
    <p>Best regards,<br/>Core Solution</p>
  `
});

// Google Sheets (don't crash if it fails)
try {
  const result = await pushLeadToGoogleSheets({
    timestamp: new Date().toISOString(),
    id: `lead_${Date.now()}`,
    fullName,
    companyName,
    businessEmail,
    message,
    sourcePage: "Website Contact Form",
    leadStatus: "New",
    leadScore: 0,
    leadQuality: "Unqualified",
    lastUpdated: new Date().toISOString(),
    followUpDate: "",
    notes: ""
  });

  console.log("Google Sheets Result:", result);
} catch (sheetError) {
  console.error("GOOGLE SHEETS ERROR:", sheetError);
}

return res.status(200).json({
  success: true
});
```

} catch (error: any) {
console.error("FULL ERROR:", error);

```
return res.status(500).json({
  error: error?.message || String(error)
});
```

}
}

