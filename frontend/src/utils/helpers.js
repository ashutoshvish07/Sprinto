import { formatDistanceToNow, format, isPast } from 'date-fns'

export const timeAgo = (date) => {
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true })
  } catch {
    return ''
  }
}

export const formatDate = (date) => {
  if (!date) return '—'
  try {
    return format(new Date(date), 'MMM d, yyyy')
  } catch {
    return '—'
  }
}

export const isOverdue = (dueDate, status) => {
  if (!dueDate || status === 'done') return false
  return isPast(new Date(dueDate))
}

export const getInitials = (name = '') => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
}

export const priorityConfig = {
  high: { label: 'High', dotClass: 'bg-red-400', badgeClass: 'bg-red-500/20 text-red-400' },
  medium: { label: 'Medium', dotClass: 'bg-amber-400', badgeClass: 'bg-amber-500/20 text-amber-400' },
  low: { label: 'Low', dotClass: 'bg-emerald-400', badgeClass: 'bg-emerald-500/20 text-emerald-400' },
}

export const statusConfig = {
  'todo': { label: 'Todo', badgeClass: 'bg-slate-700 text-slate-300', borderClass: 'border-slate-600/50' },
  'in-progress': { label: 'In Progress', badgeClass: 'bg-blue-500/20 text-blue-400', borderClass: 'border-blue-500/30' },
  'done': { label: 'Done', badgeClass: 'bg-emerald-500/20 text-emerald-400', borderClass: 'border-emerald-500/30' },
}

export const roleConfig = {
  admin: { label: 'Admin', badgeClass: 'bg-purple-500/20 text-purple-300' },
  manager: { label: 'Manager', badgeClass: 'bg-sky-500/20 text-sky-300' },
  user: { label: 'Member', badgeClass: 'bg-slate-700 text-slate-300' },
}

export const PROJECT_COLORS = [
  '#6366f1', '#0ea5e9', '#10b981', '#f59e0b',
  '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899',
]
