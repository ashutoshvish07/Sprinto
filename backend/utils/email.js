const nodemailer = require('nodemailer')

const createTransporter = () => {
  return nodemailer.createTransport({   // ← createTransport not createTransporter
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })
}

const sendEmail = async ({ to, subject, html }) => {
  try {
    const transporter = createTransporter()

    const info = await transporter.sendMail({
      from: `"Sprinto App" <${process.env.SMTP_FROM}>`,
      to,
      subject,
      html,
    })

    console.log(`✅ Email sent to ${to} — ID: ${info.messageId}`)
    return info
  } catch (err) {
    console.error('Email send error:', err.message)
    throw new Error('Email could not be sent')
  }
}

const emailWrapper = (content) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    body { font-family: Arial, sans-serif; background: #0f172a; margin: 0; padding: 20px; }
    .container { max-width: 520px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #4f46e5, #0ea5e9); padding: 32px; text-align: center; }
    .logo { font-size: 24px; font-weight: 700; color: white; }
    .body { padding: 32px; }
    .title { font-size: 20px; font-weight: 600; color: #f1f5f9; margin: 0 0 12px; }
    .text { font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 0 0 24px; }
    .btn { display: inline-block; background: #4f46e5; color: white !important; text-decoration: none; padding: 12px 28px; border-radius: 10px; font-weight: 600; font-size: 14px; }
    .expire { background: #0f172a; border: 1px solid #334155; border-radius: 8px; padding: 12px 16px; font-size: 13px; color: #64748b; margin-top: 20px; }
    .footer { padding: 20px 32px; border-top: 1px solid #334155; font-size: 12px; color: #475569; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><div class="logo">⚡ Sprinto</div></div>
    <div class="body">${content}</div>
    <div class="footer">If you didn't request this, you can safely ignore it.</div>
  </div>
</body>
</html>
`

const sendVerificationEmail = async (user, verifyUrl) => {
  return sendEmail({
    to: user.email,
    subject: '✅ Verify your Sprinto account',
    html: emailWrapper(`
      <h2 class="title">Verify your email address</h2>
      <p class="text">Hey ${user.name}, welcome to Sprinto! Click below to verify your email.</p>
      <a href="${verifyUrl}" class="btn">Verify Email Address</a>
      <div class="expire">⏰ This link expires in <strong>24 hours</strong>.</div>
    `),
  })
}

const sendPasswordResetEmail = async (user, resetUrl) => {
  return sendEmail({
    to: user.email,
    subject: '🔐 Reset your Sprinto password',
    html: emailWrapper(`
      <h2 class="title">Reset your password</h2>
      <p class="text">Hey ${user.name}, click below to set a new password.</p>
      <a href="${resetUrl}" class="btn">Reset Password</a>
      <div class="expire">⏰ This link expires in <strong>1 hour</strong>.</div>
    `),
  })
}

module.exports = { sendEmail, sendVerificationEmail, sendPasswordResetEmail }