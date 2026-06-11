import nodemailer from "nodemailer";

export default async function handler(req: any, res: any) {
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

    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: "markus@coresolution.my",
      subject: "SMTP Test",
      text: "SMTP test from Vercel"
    });

    return res.status(200).json({
      success: true,
      messageId: result.messageId
    });

  } catch (error: any) {
    console.error("SMTP ERROR:", error);

    return res.status(500).json({
      error: error?.message || String(error),
      code: error?.code,
      response: error?.response
    });
  }
}
