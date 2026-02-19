import { useState } from 'react'
import { Avatar, Badge, Button, ConfirmDialog } from './ui'
import { priorityConfig, statusConfig, formatDate, isOverdue } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'

export default function TaskCard({ task, onUpdate, onDelete, compact = false }) {
  const { user } = useAuth()
  const [showConfirm, setShowConfirm] = useState(false)

  const pc = priorityConfig[task.priority]
  const sc = statusConfig[task.status]
  const overdue = isOverdue(task.dueDate, task.status)
  const canDelete = user.role === 'admin' || user.role === 'manager'
  const canEdit = user.role !== 'user' || task.assignee?._id === user._id

  const nextStatus = {
    'todo': 'in-progress',
    'in-progress': 'done',
    'done': 'todo',
  }

  const handleStatusCycle = () => {
    if (!canEdit) return
    onUpdate(task._id, { status: nextStatus[task.status] })
  }

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 bg-slate-800/40 border border-slate-700/40 rounded-xl hover:border-slate-600/50 transition-all group">
        <button onClick={handleStatusCycle} className={`w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${task.status === 'done' ? 'bg-emerald-500 border-emerald-500' : 'border-slate-500 hover:border-indigo-400'}`} />
        <span className={`text-sm flex-1 truncate ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>{task.title}</span>
        <Badge className={pc.badgeClass}>{pc.label}</Badge>
      </div>
    )
  }

  return (
    <>
      <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 hover:border-slate-600/60 transition-all group">
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <button
              onClick={handleStatusCycle}
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex-shrink-0 transition-colors ${
                task.status === 'done'
                  ? 'bg-emerald-500 border-emerald-500'
                  : task.status === 'in-progress'
                  ? 'border-blue-400'
                  : 'border-slate-500 hover:border-indigo-400'
              }`}
            />
            <p className={`text-sm font-medium leading-snug ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
              {task.title}
            </p>
          </div>
          {canDelete && (
            <button
              onClick={() => setShowConfirm(true)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-0.5 flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
        </div>

        {task.description && (
          <p className="text-xs text-slate-500 mb-3 line-clamp-2">{task.description}</p>
        )}

        {task.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-3">
            {task.tags.map((tag) => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-slate-700/60 text-slate-400 rounded-md">{tag}</span>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${pc.badgeClass}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pc.dotClass}`} />
              {pc.label}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {task.dueDate && (
              <span className={`text-xs ${overdue ? 'text-red-400 font-medium' : 'text-slate-600'}`}>
                {overdue ? '⚠ ' : ''}{formatDate(task.dueDate)}
              </span>
            )}
            {task.assignee && <Avatar user={task.assignee} size="sm" />}
          </div>
        </div>
      </div>

      {showConfirm && (
        <ConfirmDialog
          title="Delete Task"
          message={`Are you sure you want to delete "${task.title}"? This cannot be undone.`}
          onConfirm={() => { onDelete(task._id); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
          danger
        />
      )}
    </>
  )
}
