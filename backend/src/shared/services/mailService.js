const nodemailer = require("nodemailer");
const { AppError } = require("../utils/errors");
const { logger } = require("../utils/logger");

let transporter;

function getTransporter() {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new AppError("Email service is not configured. Please set SMTP environment variables.", 500);
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
  });

  return transporter;
}

async function sendViaSendGrid({ from, to, subject, text, html }) {
  const apiKey = process.env.SENDGRID_API_KEY;
  if (!apiKey) return false;

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from.match(/<([^>]+)>/)?.[1] || from, name: from.replace(/\s*<[^>]+>\s*/, "") || undefined },
      subject,
      content: [
        { type: "text/plain", value: text },
        { type: "text/html", value: html },
      ],
    }),
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`SendGrid API error ${response.status}: ${payload}`);
  }

  return true;
}

async function sendVerificationEmail({ to, fullName, token }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new AppError("Email sender is not configured.", 500);

  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const backendBaseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
  const verifyLink = `${backendBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const subject = "Health AI - Verify your email";
  const text = `${greeting}\n\nVerify your account via this link: ${verifyLink}\n\nYour verification token is: ${token}\nThis token expires in 24 hours.`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height: 1.5; color: #0a1628;">
      <h2 style="margin-bottom: 12px; color: #054a91;">Verify your Health AI account</h2>
      <p>${greeting}</p>
      <p>Please click the button below to verify your email address:</p>
      <p>
        <a href="${verifyLink}" style="display:inline-block;padding:10px 16px;background:#054a91;color:#fff;text-decoration:none;border-radius:8px;font-weight:600;">
          Verify Email
        </a>
      </p>
      <p>If the button does not work, use this link:</p>
      <p><a href="${verifyLink}">${verifyLink}</a></p>
      <p style="margin-top: 14px;">Or use this verification token manually:</p>
      <p style="font-size: 18px; font-weight: 700; letter-spacing: 0.04em; color: #0f4c81;">${token}</p>
      <p>This token expires in 24 hours.</p>
    </div>
  `;

  try {
    const sentViaApi = await sendViaSendGrid({ from, to, subject, text, html });
    if (!sentViaApi) {
      const mailer = getTransporter();
      await mailer.sendMail({ from, to, subject, text, html });
    }
  } catch (error) {
    logger.error("Failed to send verification email", { error: error.message, to });
    throw new AppError("We could not send the verification email. Please try again.", 500);
  }
}

module.exports = { sendVerificationEmail };
