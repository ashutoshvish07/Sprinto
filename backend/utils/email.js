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
    .container { max-width: 560px; margin: 0 auto; background: #1e293b; border-radius: 16px; overflow: hidden; border: 1px solid #334155; }
    .header { background: linear-gradient(135deg, #4f46e5, #0ea5e9); padding: 28px 32px; }
    .logo { font-size: 22px; font-weight: 700; color: white; }
    .body { padding: 32px; }
    .title { font-size: 20px; font-weight: 600; color: #f1f5f9; margin: 0 0 8px; }
    .subtitle { font-size: 14px; color: #64748b; margin: 0 0 28px; }
    .task-card { background: #0f172a; border: 1px solid #334155; border-radius: 12px; padding: 18px 20px; margin-bottom: 12px; }
    .task-title { font-size: 15px; font-weight: 600; color: #f1f5f9; margin: 0 0 8px; }
    .task-meta { font-size: 12px; color: #64748b; }
    .badge { display: inline-block; padding: 2px 10px; border-radius: 20px; font-size: 11px; font-weight: 600; margin-right: 6px; }
    .badge-red { background: #fee2e2; color: #dc2626; }
    .badge-orange { background: #ffedd5; color: #c2410c; }
    .badge-yellow { background: #fef9c3; color: #a16207; }
    .badge-blue { background: #dbeafe; color: #1d4ed8; }
    .badge-high { background: #fee2e2; color: #dc2626; }
    .badge-medium { background: #ffedd5; color: #c2410c; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .btn { display: inline-block; background: #4f46e5; color: white !important; text-decoration: none; padding: 11px 24px; border-radius: 10px; font-weight: 600; font-size: 14px; margin-top: 20px; }
    .divider { border: none; border-top: 1px solid #334155; margin: 24px 0; }
    .footer { padding: 16px 32px; font-size: 12px; color: #475569; }
    .summary-box { background: #0f172a; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px; }
    .summary-grid { display: flex; gap: 20px; flex-wrap: wrap; }
    .summary-item { text-align: center; min-width: 60px; }
    .summary-num { font-size: 28px; font-weight: 700; line-height: 1; }
    .summary-label { font-size: 11px; color: #64748b; margin-top: 4px; }
    .section-title { font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin: 24px 0 12px; }
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

// ─── Due Date Reminder Email ──────────────────────────────────────────────────
const sendDueDateReminderEmail = async (user, taskGroups) => {
  const { overdue = [], dueToday = [], dueTomorrow = [], dueSoon = [] } = taskGroups
  const totalCount = overdue.length + dueToday.length + dueTomorrow.length + dueSoon.length
  if (totalCount === 0) return

  const formatDate = (d) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

  const taskCard = (task, badgeClass, badgeLabel) => `
    <div class="task-card">
      <div class="task-title">${task.title}</div>
      <div class="task-meta">
        <span class="badge ${badgeClass}">${badgeLabel}</span>
        <span class="badge badge-${task.priority}">${task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}</span>
        &nbsp;📁 ${task.project?.name || 'Unknown'}&nbsp;&nbsp;
        ${task.dueDate ? `📅 ${formatDate(task.dueDate)}` : ''}
      </div>
    </div>
  `

  const section = (emoji, title, tasks, badgeClass, badgeLabel) => {
    if (tasks.length === 0) return ''
    return `
      <div class="section-title">${emoji} ${title}</div>
      ${tasks.map((t) => taskCard(t, badgeClass, badgeLabel)).join('')}
    `
  }

  const appUrl = process.env.CLIENT_URL || 'http://localhost:5173'

  const html = emailWrapper(`
    <h2 class="title">Task Deadline Reminder</h2>
    <p class="subtitle">Hey ${user.name}, here's a summary of your tasks that need attention.</p>

    <div class="summary-box">
      <div class="summary-grid">
        ${overdue.length > 0 ? `<div class="summary-item"><div class="summary-num" style="color:#f43f5e">${overdue.length}</div><div class="summary-label">Overdue</div></div>` : ''}
        ${dueToday.length > 0 ? `<div class="summary-item"><div class="summary-num" style="color:#f97316">${dueToday.length}</div><div class="summary-label">Due Today</div></div>` : ''}
        ${dueTomorrow.length > 0 ? `<div class="summary-item"><div class="summary-num" style="color:#eab308">${dueTomorrow.length}</div><div class="summary-label">Due Tomorrow</div></div>` : ''}
        ${dueSoon.length > 0 ? `<div class="summary-item"><div class="summary-num" style="color:#6366f1">${dueSoon.length}</div><div class="summary-label">Due in 3 Days</div></div>` : ''}
      </div>
    </div>

    ${section('🔴', 'Overdue', overdue, 'badge-red', 'Overdue')}
    ${section('🟠', 'Due Today', dueToday, 'badge-orange', 'Due Today')}
    ${section('🟡', 'Due Tomorrow', dueTomorrow, 'badge-yellow', 'Due Tomorrow')}
    ${section('🔵', 'Due in 3 Days', dueSoon, 'badge-blue', 'Due Soon')}

    <hr class="divider"/>
    <a href="${appUrl}" class="btn">Open Sprinto →</a>
  `)

  let subject = '📋 Sprinto — Task Reminder'
  if (overdue.length > 0) subject = `🔴 Sprinto — ${overdue.length} Overdue Task${overdue.length > 1 ? 's' : ''}`
  else if (dueToday.length > 0) subject = `🟠 Sprinto — ${dueToday.length} Task${dueToday.length > 1 ? 's' : ''} Due Today`
  else if (dueTomorrow.length > 0) subject = `🟡 Sprinto — Tasks Due Tomorrow`

  return sendEmail({ to: user.email, subject, html })
}

module.exports = {
  sendEmail,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendDueDateReminderEmail,
}