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
  });

  return transporter;
}

async function sendVerificationEmail({ to, fullName, token }) {
  const from = process.env.EMAIL_FROM || process.env.SMTP_USER;
  if (!from) throw new AppError("Email sender is not configured.", 500);

  const mailer = getTransporter();
  const greeting = fullName ? `Hello ${fullName},` : "Hello,";
  const backendBaseUrl = process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`;
  const verifyLink = `${backendBaseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
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
    await mailer.sendMail({
      from,
      to,
      subject: "Health AI - Verify your email",
      text: `${greeting}\n\nVerify your account via this link: ${verifyLink}\n\nYour verification token is: ${token}\nThis token expires in 24 hours.`,
      html,
    });
  } catch (error) {
    logger.error("Failed to send verification email", { error: error.message, to });
    throw new AppError("We could not send the verification email. Please try again.", 500);
  }
}

module.exports = { sendVerificationEmail };
