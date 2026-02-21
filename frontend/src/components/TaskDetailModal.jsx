import { useState } from 'react'
import { Avatar, Badge } from './ui'
import CommentsPanel from './CommentsPanel'
import { priorityConfig, statusConfig, formatDate, isOverdue, roleConfig } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'

export default function TaskDetailModal({ task, onClose, onUpdate, onDelete }) {
  const { user } = useAuth()
  const pc = priorityConfig[task.priority]
  const sc = statusConfig[task.status]
  const overdue = isOverdue(task.dueDate, task.status)
  const canEdit = user.role !== 'user' || task.assignee?._id === user._id
  const canDelete = user.role === 'admin' || user.role === 'manager'

  const nextStatus = {
    'todo': 'in-progress',
    'in-progress': 'done',
    'done': 'todo',
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      {/* Wide modal — left: task info, right: comments */}
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Left: Task Details ── */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-slate-700/60">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 mb-6">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              {/* Status toggle circle */}
              <button
                onClick={() => canEdit && onUpdate(task._id, { status: nextStatus[task.status] })}
                title="Click to change status"
                className={`mt-1 w-5 h-5 rounded-full border-2 flex-shrink-0 transition-colors ${
                  task.status === 'done'
                    ? 'bg-emerald-500 border-emerald-500'
                    : task.status === 'in-progress'
                    ? 'border-blue-400 hover:bg-blue-400/20'
                    : 'border-slate-500 hover:border-indigo-400'
                }`}
              />
              <h2 className={`text-lg font-semibold leading-snug ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'}`}>
                {task.title}
              </h2>
            </div>

            {/* Close */}
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Badges row */}
          <div className="flex flex-wrap gap-2 mb-6">
            <Badge className={sc.badgeClass}>{sc.label}</Badge>
            <Badge className={`${pc.badgeClass} inline-flex items-center gap-1`}>
              <span className={`w-1.5 h-1.5 rounded-full ${pc.dotClass}`} />
              {pc.label}
            </Badge>
            {overdue && (
              <Badge className="bg-red-500/20 text-red-400">⚠ Overdue</Badge>
            )}
          </div>

          {/* Description */}
          <div className="mb-6">
            <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Description</h3>
            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
              {task.description || <span className="text-slate-600 italic">No description provided.</span>}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div>
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Assignee</h3>
              {task.assignee ? (
                <div className="flex items-center gap-2">
                  <Avatar user={task.assignee} size="sm" />
                  <div>
                    <p className="text-sm text-white">{task.assignee.name}</p>
                    <p className="text-xs text-slate-500">{task.assignee.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Unassigned</p>
              )}
            </div>

            <div>
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Created By</h3>
              {task.createdBy ? (
                <div className="flex items-center gap-2">
                  <Avatar user={task.createdBy} size="sm" />
                  <p className="text-sm text-white">{task.createdBy.name}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">—</p>
              )}
            </div>

            <div>
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Due Date</h3>
              <p className={`text-sm ${overdue ? 'text-red-400 font-medium' : 'text-slate-300'}`}>
                {task.dueDate ? formatDate(task.dueDate) : '—'}
              </p>
            </div>

            <div>
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Project</h3>
              <div className="flex items-center gap-2">
                {task.project?.color && (
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: task.project.color }} />
                )}
                <p className="text-sm text-slate-300">{task.project?.name || '—'}</p>
              </div>
            </div>
          </div>

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div className="mb-6">
              <h3 className="text-xs text-slate-400 uppercase tracking-wider mb-2">Tags</h3>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 bg-slate-700/60 text-slate-300 rounded-lg">
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          {(canEdit || canDelete) && (
            <div className="flex gap-2 pt-4 border-t border-slate-700/60">
              {canEdit && (
                <button
                  onClick={() => canEdit && onUpdate(task._id, { status: nextStatus[task.status] })}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl transition-colors"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
                  </svg>
                  Move to {statusConfig[nextStatus[task.status]]?.label}
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => { onDelete(task._id); onClose() }}
                  className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors ml-auto"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                    <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                  </svg>
                  Delete Task
                </button>
              )}
            </div>
          )}
        </div>

        {/* ── Right: Comments ── */}
        <div className="w-80 flex-shrink-0 flex flex-col p-6 max-h-[90vh]">
          <CommentsPanel taskId={task._id} taskTitle={task.title} />
        </div>
      </div>
    </div>
  )
}
