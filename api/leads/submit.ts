export default async function handler(req: any, res: any) {
  const response = await fetch(
    "https://script.google.com/macros/s/AKfycbwOIFq7IfW6jyjC23suWhnCD4ZNxGnl2USb51vsAm12UTPUTguUmcdDgKnkaRCe4kxN/exec",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fullName: "Test Lead",
        companyName: "Core Solution",
        businessEmail: "test@test.com",
        message: "Testing Apps Script"
      })
    }
  );

  const text = await response.text();

  return res.status(200).json({
    response: text
  });
}
