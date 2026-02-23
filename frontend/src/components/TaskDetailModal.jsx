import { useState, useCallback, useMemo } from 'react'
import { useSelector } from 'react-redux'
import { selectUsers } from '../store/slices/usersSlice'
import { Avatar } from './ui'
import CommentsPanel from './CommentsPanel'
import { priorityConfig, statusConfig, formatDate, isOverdue } from '../utils/helpers'
import { useAuth } from '../context/AuthContext'

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = ['todo', 'in-progress', 'done']

export default function TaskDetailModal({ task: initialTask, onClose, onUpdate, onDelete }) {
  const { user } = useAuth()
  const users = useSelector(selectUsers)

  const [task, setTask] = useState(initialTask)
  const [saving, setSaving] = useState(false)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [editingAssignee, setEditingAssignee] = useState(false)
  const [titleVal, setTitleVal] = useState(task.title)
  const [descVal, setDescVal] = useState(task.description || '')

  const pc = useMemo(() => priorityConfig[task.priority], [task.priority])
  const sc = useMemo(() => statusConfig[task.status], [task.status])
  const overdue = useMemo(() => isOverdue(task.dueDate, task.status), [task.dueDate, task.status])

  const isAssignee = useMemo(() => task.assignee?._id === user._id, [task.assignee?._id, user._id])
  const canEdit = useMemo(() => user.role === 'admin' || user.role === 'manager' || isAssignee, [user.role, isAssignee])
  const canDelete = useMemo(() => user.role === 'admin' || user.role === 'manager', [user.role])
  const canFullEdit = useMemo(() => user.role === 'admin' || user.role === 'manager', [user.role])

  const save = useCallback(async (changes) => {
    setSaving(true)
    try {
      await onUpdate(task._id, changes)
    } finally {
      setSaving(false)
    }
  }, [onUpdate, task._id])

  const handleStatusChange = useCallback((newStatus) => {
    if (!canEdit) return
    setTask((t) => ({ ...t, status: newStatus }))
    save({ status: newStatus })
  }, [canEdit, save])

  const handlePriorityChange = useCallback((newPriority) => {
    if (!canFullEdit) return
    setTask((t) => ({ ...t, priority: newPriority }))
    save({ priority: newPriority })
  }, [canFullEdit, save])

  const handleAssigneeChange = useCallback(async (userId) => {
    if (!canFullEdit) return
    const newAssignee = users.find((u) => u._id === userId) || null
    setTask((t) => ({ ...t, assignee: newAssignee }))
    setSaving(true)
    try {
      await onUpdate(task._id, { assignee: userId || null })
    } finally {
      setSaving(false)
      setEditingAssignee(false)
    }
  }, [canFullEdit, users, task._id, onUpdate])

  const handleTitleSave = useCallback(() => {
    if (!titleVal.trim() || titleVal === task.title) {
      setEditingTitle(false)
      return
    }
    setTask((t) => ({ ...t, title: titleVal.trim() }))
    save({ title: titleVal.trim() })
    setEditingTitle(false)
  }, [titleVal, task.title, save])

  const handleDescSave = useCallback(() => {
    if (descVal === task.description) {
      setEditingDesc(false)
      return
    }
    setTask((t) => ({ ...t, description: descVal }))
    save({ description: descVal })
    setEditingDesc(false)
  }, [descVal, task.description, save])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >

        {/* ── Left: Task Details ── */}
        <div className="flex-1 overflow-y-auto p-6 border-r border-slate-700/60 space-y-5">

          {/* Header */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {editingTitle && canFullEdit ? (
                <input
                  autoFocus
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false) }}
                  className="w-full bg-slate-800 border border-indigo-500 rounded-xl px-3 py-2 text-white text-lg font-semibold focus:outline-none"
                />
              ) : (
                <div className='flex'>  
                <h2
                  onClick={() => canFullEdit && setEditingTitle(true)}
                  className={`text-lg font-semibold leading-snug ${task.status === 'done' ? 'line-through text-slate-500' : 'text-white'} ${canFullEdit ? 'cursor-text hover:text-indigo-300 transition-colors' : ''}`}
                  title={canFullEdit ? 'Click to edit title' : ''}
                >
                  {task.title}
                </h2>
                </div>
              )}
            </div>
            <button onClick={onClose} className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition-colors flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Status — ALL roles can change this */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => {
                const cfg = statusConfig[s]
                return (
                  <button
                    key={s}
                    disabled={!canEdit || saving}
                    onClick={() => handleStatusChange(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      task.status === s
                        ? `${cfg.badgeClass} border-transparent`
                        : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            {isAssignee && !canFullEdit && (
              <p className="text-xs text-slate-600 mt-1">You can update the status of your assigned tasks</p>
            )}
          </div>

          {/* Priority — admin/manager only */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => {
                const cfg = priorityConfig[p]
                return (
                  <button
                    key={p}
                    disabled={!canFullEdit || saving}
                    onClick={() => handlePriorityChange(p)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border ${
                      task.priority === p
                        ? `${cfg.badgeClass} border-transparent`
                        : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    } ${!canFullEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description — admin/manager can edit */}
          <div>
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Description</label>
            {editingDesc && canFullEdit ? (
              <div>
                <textarea
                  autoFocus
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  rows={4}
                  className="w-full bg-slate-800 border border-indigo-500 rounded-xl px-3 py-2.5 text-white text-sm resize-none focus:outline-none"
                />
                <div className="flex gap-2 mt-2">
                  <button onClick={handleDescSave} className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg">Save</button>
                  <button onClick={() => { setEditingDesc(false); setDescVal(task.description || '') }} className="text-xs px-3 py-1.5 text-slate-400 hover:text-white">Cancel</button>
                </div>
              </div>
            ) : (
              <p
                onClick={() => canFullEdit && setEditingDesc(true)}
                className={`text-sm text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[40px] p-2 rounded-lg transition-colors ${canFullEdit ? 'cursor-text hover:bg-slate-800/50' : ''}`}
              >
                {task.description || <span className="text-slate-600 italic">No description. {canFullEdit ? 'Click to add one.' : ''}</span>}
              </p>
            )}
          </div>

          {/* Assignee — admin/manager can change, everyone can see */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Assignee</label>
              {canFullEdit && editingAssignee ? (
                <select
                  autoFocus
                  value={task.assignee?._id || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  onBlur={() => setEditingAssignee(false)}
                  disabled={saving}
                  className="w-full bg-slate-800 border border-indigo-500 rounded-xl px-3 py-2 text-white text-sm focus:outline-none transition-colors"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              ) : canFullEdit ? (
                <p
                  onClick={() => setEditingAssignee(true)}
                  className="text-sm text-slate-300 cursor-pointer hover:text-indigo-400 p-2 rounded-lg hover:bg-slate-800/50 transition-colors"
                >
                  {task.assignee?.name || 'Unassigned'}
                </p>
              ) : task.assignee ? (
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
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Project</label>
              <div className="flex items-center gap-2 mt-1">
                {task.project?.color && (
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: task.project.color }} />
                )}
                <p className="text-sm text-slate-300">{task.project?.name || '—'}</p>
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Due Date</label>
              <p className={`text-sm mt-1 ${overdue ? 'text-red-400 font-medium' : 'text-slate-300'}`}>
                {overdue && '⚠ '}{task.dueDate ? formatDate(task.dueDate) : '—'}
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Created By</label>
              {task.createdBy ? (
                <div className="flex items-center gap-2 mt-1">
                  <Avatar user={task.createdBy} size="sm" />
                  <p className="text-sm text-white">{task.createdBy.name}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">—</p>
              )}
            </div>
          </div>

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block">Tags</label>
              <div className="flex flex-wrap gap-1.5">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-xs px-2.5 py-1 bg-slate-700/60 text-slate-300 rounded-lg">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Saving indicator */}
          {saving && (
            <p className="text-xs text-indigo-400 animate-pulse">Saving...</p>
          )}

          {/* Delete */}
          {canDelete && (
            <div className="pt-4 border-t border-slate-700/60">
              <button
                onClick={() => { onDelete(task._id); onClose() }}
                className="flex items-center gap-2 px-3 py-2 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
                Delete Task
              </button>
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
