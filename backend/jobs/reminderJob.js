const cron = require('node-cron')
const Task = require('../models/Task')
const { sendDueDateReminderEmail } = require('../utils/email')

// ─── Date Helpers ─────────────────────────────────────────────────────────────

const startOfDay = (date) => {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const endOfDay = (date) => {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

const addDays = (date, days) => {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

// ─── Core Logic ───────────────────────────────────────────────────────────────

const sendDueDateReminders = async () => {
  console.log('\n⏰ [CRON] Running due date reminder job...')

  const now = new Date()
  const todayStart = startOfDay(now)
  const todayEnd = endOfDay(now)
  const tomorrowStart = startOfDay(addDays(now, 1))
  const tomorrowEnd = endOfDay(addDays(now, 1))
  const in3DaysStart = startOfDay(addDays(now, 2))
  const in3DaysEnd = endOfDay(addDays(now, 3))

  try {
    // Fetch all incomplete tasks that have a due date
    // Populate assignee (email, name) and project (name)
    const tasks = await Task.find({
      status: { $ne: 'done' },           // not completed
      dueDate: { $ne: null },            // has a due date
      assignee: { $ne: null },           // has someone assigned
    })
      .populate('assignee', 'name email isActive')
      .populate('project', 'name color')
      .lean()

    if (tasks.length === 0) {
      console.log('✅ [CRON] No pending tasks with due dates found.')
      return
    }

    // ── Group tasks by assignee ──────────────────────────────────────────────
    // One email per user with all their tasks grouped by urgency
    const userTaskMap = new Map()

    for (const task of tasks) {
      const assignee = task.assignee

      // Skip deactivated users
      if (!assignee || !assignee.isActive) continue

      const userId = assignee._id.toString()

      if (!userTaskMap.has(userId)) {
        userTaskMap.set(userId, {
          user: assignee,
          overdue: [],
          dueToday: [],
          dueTomorrow: [],
          dueSoon: [],
        })
      }

      const entry = userTaskMap.get(userId)
      const due = new Date(task.dueDate)

      if (due < todayStart) {
        // Past due date = overdue
        entry.overdue.push(task)
      } else if (due >= todayStart && due <= todayEnd) {
        // Due today
        entry.dueToday.push(task)
      } else if (due >= tomorrowStart && due <= tomorrowEnd) {
        // Due tomorrow
        entry.dueTomorrow.push(task)
      } else if (due >= in3DaysStart && due <= in3DaysEnd) {
        // Due in 2-3 days
        entry.dueSoon.push(task)
      }
      // Tasks due in 4+ days are ignored
    }

    // ── Send emails ──────────────────────────────────────────────────────────
    let emailsSent = 0
    let emailsSkipped = 0

    for (const [userId, entry] of userTaskMap) {
      const { user, overdue, dueToday, dueTomorrow, dueSoon } = entry
      const total = overdue.length + dueToday.length + dueTomorrow.length + dueSoon.length

      if (total === 0) {
        emailsSkipped++
        continue
      }

      try {
        await sendDueDateReminderEmail(user, { overdue, dueToday, dueTomorrow, dueSoon })
        emailsSent++
        console.log(`📧 [CRON] Reminder sent to ${user.name} (${user.email}) — ${total} task(s)`)
      } catch (err) {
        console.error(`❌ [CRON] Failed to send to ${user.email}:`, err.message)
      }

      // Small delay between emails to avoid SMTP rate limits
      await new Promise((r) => setTimeout(r, 300))
    }

    console.log(`✅ [CRON] Done — ${emailsSent} emails sent, ${emailsSkipped} users had no due tasks.\n`)

  } catch (err) {
    console.error('❌ [CRON] Due date reminder job failed:', err.message)
  }
}

// ─── Schedule ─────────────────────────────────────────────────────────────────

const startReminderCron = () => {
  // Runs every day at 8:00 AM server time
  // Cron format: second(optional) minute hour day month weekday
  // '0 8 * * *' = at 08:00 every day
  const schedule = process.env.REMINDER_CRON || '0 8 * * *'

  cron.schedule(schedule, sendDueDateReminders, {
    scheduled: true,
    timezone: process.env.CRON_TIMEZONE || 'Asia/Kolkata', // IST by default
  })

  console.log(`⏰ Due date reminder cron scheduled — runs at: ${schedule}   (${process.env.CRON_TIMEZONE || 'Asia/Kolkata'})`)
}

module.exports = { startReminderCron, sendDueDateReminders }
