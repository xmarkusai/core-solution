import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const { fullName, companyName, businessEmail, phoneNumber, message } = req.body;

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT),
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "markus@coresolution.my",
      subject: `New Lead - ${companyName}`,
      html: `<p>Name: ${fullName}</p><p>Company: ${companyName}</p><p>Email: ${businessEmail}</p><p>Phone: ${phoneNumber}</p><p>Message: ${message}</p>`
    });

    await fetch(process.env.GOOGLE_SCRIPT_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fullName, companyName, businessEmail, phoneNumber, message })
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    return res.status(500).json({ error: error.message });
  }
}
