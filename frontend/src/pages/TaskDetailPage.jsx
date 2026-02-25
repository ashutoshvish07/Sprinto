import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import { updateTask, deleteTask } from '../store/slices/tasksSlice'
import { fetchUsers, selectUsers } from '../store/slices/usersSlice'
import { tasksAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Avatar, Badge, Spinner, Button } from '../components/ui'
import CommentsPanel from '../components/CommentsPanel'
import { priorityConfig, statusConfig, formatDate, isOverdue } from '../utils/helpers'

const PRIORITIES = ['low', 'medium', 'high']
const STATUSES = ['todo', 'in-progress', 'done']

export default function TaskDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const dispatch = useDispatch()
  const { user } = useAuth()
  const toast = useToast()
  const users = useSelector(selectUsers)

  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(null)
  const [editingTitle, setEditingTitle] = useState(false)
  const [editingDesc, setEditingDesc] = useState(false)
  const [titleVal, setTitleVal] = useState('')
  const [descVal, setDescVal] = useState('')

  useEffect(() => {
    if (users.length === 0) dispatch(fetchUsers())
  }, [])

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const res = await tasksAPI.getOne(id)
        setTask(res.data.task)
        setTitleVal(res.data.task.title)
        setDescVal(res.data.task.description || '')
      } catch (err) {
        setError(err.response?.data?.message || 'Task not found')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size="lg" />
    </div>
  )

  if (error) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
      <p className="text-slate-400">{error}</p>
      <Button onClick={() => navigate(-1)}>Go Back</Button>
    </div>
  )

  if (!task) return null

  const pc = priorityConfig[task.priority]
  const sc = statusConfig[task.status]
  const overdue = isOverdue(task.dueDate, task.status)
  const isAssignee = task.assignee?._id === user._id
  const canEdit = user.role === 'admin' || user.role === 'manager' || isAssignee
  const canDelete = user.role === 'admin' || user.role === 'manager'
  const canFullEdit = user.role === 'admin' || user.role === 'manager'

  const save = async (changes) => {
    setSaving(true)
    try {
      const result = await dispatch(updateTask({ id: task._id, data: changes }))
      if (updateTask.fulfilled.match(result)) {
        setTask((t) => ({ ...t, ...changes }))
        toast.success('Task updated')
      }
    } catch (err) {
      toast.error('Failed to update task')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!window.confirm('Delete this task? This cannot be undone.')) return
    await dispatch(deleteTask(task._id))
    toast.success('Task deleted')
    navigate(-1)
  }

  const handleTitleSave = () => {
    if (!titleVal.trim() || titleVal === task.title) { setEditingTitle(false); return }
    save({ title: titleVal.trim() })
    setTask((t) => ({ ...t, title: titleVal.trim() }))
    setEditingTitle(false)
  }

  const handleDescSave = () => {
    if (descVal === (task.description || '')) { setEditingDesc(false); return }
    save({ description: descVal })
    setTask((t) => ({ ...t, description: descVal }))
    setEditingDesc(false)
  }

  const handleAssigneeChange = (userId) => {
    if (!canFullEdit) return
    const newAssignee = users.find((u) => u._id === userId) || null
    save({ assignee: userId || null })
    setTask((t) => ({ ...t, assignee: newAssignee }))
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">

      {/* Back Button + Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
            <path d="M19 12H5M12 5l-7 7 7 7" />
          </svg>
          Back
        </button>
        <span className="text-slate-700">/</span>
        <span className="text-slate-500 text-sm">Tasks</span>
        <span className="text-slate-700">/</span>
        <span className="text-slate-300 text-sm truncate max-w-xs">{task.title}</span>
      </div>

      <div className="grid lg:grid-cols-5 gap-6">

        {/* ── Left: Task Details ── */}
        <div className="lg:col-span-3 space-y-5">

          {/* Title */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
            {editingTitle && canFullEdit ? (
              <div className="space-y-2">
                <input
                  autoFocus
                  value={titleVal}
                  onChange={(e) => setTitleVal(e.target.value)}
                  onBlur={handleTitleSave}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleTitleSave(); if (e.key === 'Escape') setEditingTitle(false) }}
                  className="w-full bg-slate-800 border border-indigo-500 rounded-xl px-4 py-3 text-white text-xl font-bold focus:outline-none"
                />
                <p className="text-xs text-slate-500">Press Enter to save, Esc to cancel</p>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-4">
                <h1
                  onClick={() => canFullEdit && setEditingTitle(true)}
                  className={`text-xl font-bold leading-snug flex-1 ${
                    task.status === 'done' ? 'line-through text-slate-500' : 'text-white'
                  } ${canFullEdit ? 'cursor-text hover:text-indigo-300 transition-colors' : ''}`}
                >
                  {task.title}
                  {canFullEdit && <span className="ml-2 text-slate-600 text-base font-normal">✏️</span>}
                </h1>
                {overdue && (
                  <span className="flex-shrink-0 text-xs px-2.5 py-1 bg-red-500/20 text-red-400 rounded-lg font-medium">
                    ⚠ Overdue
                  </span>
                )}
              </div>
            )}

            {/* Badges */}
            <div className="flex flex-wrap gap-2 mt-4">
              <Badge className={sc.badgeClass}>{sc.label}</Badge>
              <Badge className={`${pc.badgeClass} inline-flex items-center gap-1`}>
                <span className={`w-1.5 h-1.5 rounded-full ${pc.dotClass}`} />
                {pc.label} Priority
              </Badge>
              {task.project && (
                <Badge className="bg-slate-700/60 text-slate-300 inline-flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ background: task.project.color }} />
                  {task.project.name}
                </Badge>
              )}
            </div>

            {saving && <p className="text-xs text-indigo-400 animate-pulse mt-3">Saving...</p>}
          </div>

          {/* Status */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-3 block font-semibold">Status</label>
            <div className="flex gap-2 flex-wrap">
              {STATUSES.map((s) => {
                const cfg = statusConfig[s]
                return (
                  <button
                    key={s}
                    disabled={!canEdit || saving}
                    onClick={() => { save({ status: s }); setTask((t) => ({ ...t, status: s })) }}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      task.status === s
                        ? `${cfg.badgeClass} border-transparent scale-105`
                        : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    } ${!canEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            {isAssignee && !canFullEdit && (
              <p className="text-xs text-slate-600 mt-2">As the assignee, you can update this task's status</p>
            )}
          </div>

          {/* Priority */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-3 block font-semibold">Priority</label>
            <div className="flex gap-2 flex-wrap">
              {PRIORITIES.map((p) => {
                const cfg = priorityConfig[p]
                return (
                  <button
                    key={p}
                    disabled={!canFullEdit || saving}
                    onClick={() => { save({ priority: p }); setTask((t) => ({ ...t, priority: p })) }}
                    className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${
                      task.priority === p
                        ? `${cfg.badgeClass} border-transparent scale-105`
                        : 'border-slate-700 text-slate-500 hover:border-slate-500 hover:text-slate-300'
                    } ${!canFullEdit ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                  >
                    <span className={`w-2 h-2 rounded-full ${cfg.dotClass}`} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Description */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
            <label className="text-xs text-slate-400 uppercase tracking-wider mb-3 block font-semibold">Description</label>
            {editingDesc && canFullEdit ? (
              <div className="space-y-3">
                <textarea
                  autoFocus
                  value={descVal}
                  onChange={(e) => setDescVal(e.target.value)}
                  rows={6}
                  placeholder="Add a description..."
                  className="w-full bg-slate-800 border border-indigo-500 rounded-xl px-4 py-3 text-white text-sm resize-none focus:outline-none leading-relaxed"
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleDescSave}>Save</Button>
                  <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setDescVal(task.description || '') }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => canFullEdit && setEditingDesc(true)}
                className={`min-h-[80px] p-3 rounded-xl transition-colors ${canFullEdit ? 'cursor-text hover:bg-slate-800/50' : ''}`}
              >
                {task.description ? (
                  <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{task.description}</p>
                ) : (
                  <p className="text-sm text-slate-600 italic">
                    {canFullEdit ? 'Click to add a description...' : 'No description provided.'}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Tags */}
          {task.tags?.length > 0 && (
            <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-3 block font-semibold">Tags</label>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <span key={tag} className="text-xs px-3 py-1.5 bg-slate-700/60 text-slate-300 rounded-lg">{tag}</span>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          {canDelete && (
            <div className="bg-slate-900 border border-red-900/30 rounded-2xl p-6">
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-3 block font-semibold">Danger Zone</label>
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2.5 text-sm bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-xl transition-colors border border-red-500/20"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                </svg>
                Delete this task permanently
              </button>
            </div>
          )}
        </div>

        {/* ── Right: Meta + Comments ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Meta info */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6 space-y-5">

            {/* Assignee */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block font-semibold">Assignee</label>
              {canFullEdit ? (
                <select
                  value={task.assignee?._id || ''}
                  onChange={(e) => handleAssigneeChange(e.target.value)}
                  disabled={saving}
                  className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u._id} value={u._id}>{u.name}</option>
                  ))}
                </select>
              ) : task.assignee ? (
                <div className="flex items-center gap-3">
                  <Avatar user={task.assignee} size="sm" />
                  <div>
                    <p className="text-sm text-white font-medium">{task.assignee.name}</p>
                    <p className="text-xs text-slate-500">{task.assignee.email}</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-600">Unassigned</p>
              )}
            </div>

            {/* Created By */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block font-semibold">Created By</label>
              {task.createdBy ? (
                <div className="flex items-center gap-3">
                  <Avatar user={task.createdBy} size="sm" />
                  <p className="text-sm text-white">{task.createdBy.name}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">—</p>
              )}
            </div>

            {/* Due Date */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block font-semibold">Due Date</label>
              <p className={`text-sm font-medium ${overdue ? 'text-red-400' : 'text-slate-300'}`}>
                {overdue && '⚠ '}{task.dueDate ? formatDate(task.dueDate) : '—'}
              </p>
            </div>

            {/* Project */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block font-semibold">Project</label>
              {task.project ? (
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: task.project.color }} />
                  <p className="text-sm text-slate-300">{task.project.name}</p>
                </div>
              ) : (
                <p className="text-sm text-slate-600">—</p>
              )}
            </div>

            {/* Created At */}
            <div>
              <label className="text-xs text-slate-400 uppercase tracking-wider mb-2 block font-semibold">Created</label>
              <p className="text-sm text-slate-400">{formatDate(task.createdAt)}</p>
            </div>
          </div>

          {/* Comments */}
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl p-6" style={{ minHeight: '400px' }}>
            <CommentsPanel taskId={task._id} taskTitle={task.title} />
          </div>
        </div>
      </div>
    </div>
  )
}
