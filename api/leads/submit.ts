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

```
console.log("STEP 1");

await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: "markus@coresolution.my",
  subject: "Lead Test",
  text: "Internal email test"
});

console.log("STEP 2");

await transporter.sendMail({
  from: process.env.SMTP_FROM,
  to: "markustan94@gmail.com",
  subject: "Auto Reply Test",
  text: "Auto reply test"
});

console.log("STEP 3");

const response = await fetch(process.env.GOOGLE_SCRIPT_URL!, {
  method: "POST",
  headers: {
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    fullName: "Test",
    companyName: "Test Company",
    businessEmail: "test@test.com",
    message: "Testing"
  })
});

const text = await response.text();

console.log("GOOGLE RESPONSE:", text);

console.log("STEP 4");

return res.status(200).json({
  success: true,
  googleResponse: text
});
```

} catch (error: any) {
console.error("FULL ERROR:", error);

```
return res.status(500).json({
  error: error?.message || String(error),
  stack: error?.stack
});
```

}
}
