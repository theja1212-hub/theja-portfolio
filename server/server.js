const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// ── MIDDLEWARE ──
app.use(express.json());
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['POST', 'GET'],
}));

// Rate limit: max 5 contact messages per IP per hour
const limiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { success: false, message: 'Too many messages. Please try again later.' }
});

// ── EMAIL TRANSPORTER ──
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password (not your real password)
  },
});

// ── VERIFY CONNECTION ON START ──
transporter.verify((err) => {
  if (err) console.error('❌ Email connection error:', err.message);
  else console.log('✅ Email server ready');
});

// ── CONTACT ROUTE ──
app.post('/api/contact', limiter, async (req, res) => {
  const { firstName, lastName, email, subject, message } = req.body;

  // Basic validation
  if (!firstName || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email and message are required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Invalid email address.' });
  }

  try {
    // Email to YOU (Theja)
    await transporter.sendMail({
      from: `"Portfolio Contact" <${process.env.EMAIL_USER}>`,
      to: process.env.EMAIL_USER,
      replyTo: email,
      subject: `📬 Portfolio: ${subject || 'New Message'} — from ${firstName} ${lastName}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#07071A;color:#F5F3FF;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#C9A84C,#F0C96B);padding:24px 28px">
            <h2 style="margin:0;color:#04040E;font-size:1.2rem">New Portfolio Message</h2>
          </div>
          <div style="padding:28px">
            <p style="margin:0 0 8px"><span style="color:#C9A84C;font-weight:600">From:</span> ${firstName} ${lastName}</p>
            <p style="margin:0 0 8px"><span style="color:#C9A84C;font-weight:600">Email:</span> <a href="mailto:${email}" style="color:#00C9E0">${email}</a></p>
            <p style="margin:0 0 20px"><span style="color:#C9A84C;font-weight:600">Subject:</span> ${subject || '—'}</p>
            <div style="background:rgba(255,255,255,0.05);border-left:3px solid #C9A84C;border-radius:4px;padding:16px">
              <p style="margin:0;white-space:pre-wrap;line-height:1.7">${message}</p>
            </div>
          </div>
          <div style="padding:16px 28px;border-top:1px solid rgba(255,255,255,0.06);font-size:0.8rem;color:#7A788F">
            Sent from your portfolio contact form
          </div>
        </div>
      `
    });

    // Auto-reply to the sender
    await transporter.sendMail({
      from: `"Theja S — Portfolio" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: `Thanks for reaching out, ${firstName}! 👋`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;background:#07071A;color:#F5F3FF;border-radius:12px;overflow:hidden">
          <div style="background:linear-gradient(135deg,#C9A84C,#F0C96B);padding:24px 28px">
            <h2 style="margin:0;color:#04040E">Got your message!</h2>
          </div>
          <div style="padding:28px">
            <p>Hey <strong>${firstName}</strong>,</p>
            <p style="color:#9997B0">Thanks for getting in touch! I've received your message and will get back to you within <strong style="color:#F5F3FF">24–48 hours</strong>.</p>
            <p style="color:#9997B0">Here's a copy of what you sent:</p>
            <div style="background:rgba(255,255,255,0.04);border-left:3px solid #C9A84C;border-radius:4px;padding:16px;margin-top:12px">
              <p style="margin:0;color:#9997B0;font-size:0.9rem;white-space:pre-wrap">${message}</p>
            </div>
            <div style="margin-top:28px;padding-top:20px;border-top:1px solid rgba(255,255,255,0.06)">
              <p style="margin:0;font-size:0.85rem;color:#7A788F">— Theja S</p>
              <p style="margin:4px 0 0;font-size:0.8rem;color:#7A788F">MERN Stack Developer · Chennai, India</p>
              <p style="margin:4px 0 0;font-size:0.8rem"><a href="https://github.com/theja1212-hub" style="color:#00C9E0">github.com/theja1212-hub</a></p>
            </div>
          </div>
        </div>
      `
    });

    res.json({ success: true, message: 'Message sent! You will receive a reply within 24–48 hours.' });

  } catch (err) {
    console.error('Email send error:', err.message);
    res.status(500).json({ success: false, message: 'Failed to send message. Please try again.' });
  }
});

// ── HEALTH CHECK ──
app.get('/api/health', (_, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// ── START ──
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));