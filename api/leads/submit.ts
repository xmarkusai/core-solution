import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { fullName, companyName, businessEmail, phoneNumber, message } = req.body;

  if (!fullName || !companyName || !businessEmail || !phoneNumber || !message) {
    return res.status(400).json({ error: "Required fields are missing" });
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

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "markus@coresolution.my",
      subject: `New Lead - ${companyName}`,
      html: `
        <h2>New Lead Received</h2>
        <p><strong>Name:</strong> ${fullName}</p>
        <p><strong>Company:</strong> ${companyName}</p>
        <p><strong>Email:</strong> ${businessEmail}</p>
        <p><strong>Phone:</strong> ${phoneNumber}</p>
        <p><strong>Message:</strong> ${message}</p>
      `
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: businessEmail,
      subject: "Thank you for contacting Core Solution",
      html: `
        <h2>Thank You</h2>
        <p>Hi ${fullName},</p>
        <p>Thank you for contacting Core Solution.</p>
        <p>Our team will contact you shortly.</p>
      `
    });

    await fetch(process.env.GOOGLE_SCRIPT_URL as string, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fullName,
        companyName,
        businessEmail,
        phoneNumber,
        message
      })
    });

    return res.status(200).json({ success: true });
  } catch (error: any) {
    console.error("FULL ERROR:", error);
    return res.status(500).json({ error: error?.message || String(error) });
  }
}
