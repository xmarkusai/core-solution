import React, { useState } from "react";

export default function ContactSession() {
  const [fullName, setFullName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [businessEmail, setBusinessEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!fullName.trim()) return setErrorMsg("Full Name is required.");
    if (!companyName.trim()) return setErrorMsg("Company Name is required.");
    if (!businessEmail.trim()) return setErrorMsg("Business Email is required.");
    if (!/\S+@\S+\.\S+/.test(businessEmail)) return setErrorMsg("Enter a valid email.");
    if (!phoneNumber.trim()) return setErrorMsg("Phone Number is required.");
    if (!message.trim()) return setErrorMsg("Message is required.");

    try {
      const res = await fetch("/api/leads/submit", {
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

      if (res.ok) {
        alert("Success! Your message was sent.");
        setFullName("");
        setCompanyName("");
        setBusinessEmail("");
        setPhoneNumber("");
        setMessage("");
      } else {
        setErrorMsg("Failed to send. Please try again.");
      }
    } catch (err) {
      setErrorMsg("An error occurred. Please try again.");
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {errorMsg && <p style={{ color: "red" }}>{errorMsg}</p>}
      
      <div>
        <label>Full Name</label>
        <input type="text" value={fullName} onChange={(e) => setFullName(e.target.value)} />
      </div>
      
      <div>
        <label>Company Name</label>
        <input type="text" value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
      </div>
      
      <div>
        <label>Business Email</label>
        <input type="email" value={businessEmail} onChange={(e) => setBusinessEmail(e.target.value)} />
      </div>
      
      <div>
        <label>Phone Number</label>
        <input type="tel" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} />
      </div>
      
      <div>
        <label>Message</label>
        <textarea value={message} onChange={(e) => setMessage(e.target.value)} />
      </div>
      
      <button type="submit">Book Free AI Consultation</button>
    </form>
  );
}
