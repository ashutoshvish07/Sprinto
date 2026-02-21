import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { useWS } from '../context/WSContext'
import { useToast } from '../context/ToastContext'
import { Avatar, Spinner } from './ui'
import { timeAgo } from '../utils/helpers'
import api from '../api/client'

// ─── API calls ────────────────────────────────────────────────────────────────
const commentsAPI = {
  getAll: (taskId) => api.get(`/comments/${taskId}`),
  add: (taskId, text) => api.post(`/comments/${taskId}`, { text }),
  edit: (commentId, text) => api.put(`/comments/${commentId}`, { text }),
  delete: (commentId) => api.delete(`/comments/${commentId}`),
}

// ─── Single Comment ───────────────────────────────────────────────────────────
function CommentItem({ comment, currentUser, onEdit, onDelete }) {
  const [isEditing, setIsEditing] = useState(false)
  const [editText, setEditText] = useState(comment.text)
  const [loading, setLoading] = useState(false)
  const textareaRef = useRef(null)

  const isAuthor = comment.author?._id === currentUser._id
  const canDelete = isAuthor || ['admin', 'manager'].includes(currentUser.role)

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.setSelectionRange(editText.length, editText.length)
    }
  }, [isEditing])

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === comment.text) {
      setIsEditing(false)
      return
    }
    setLoading(true)
    try {
      await onEdit(comment._id, editText.trim())
      setIsEditing(false)
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSaveEdit()
    if (e.key === 'Escape') { setIsEditing(false); setEditText(comment.text) }
  }

  return (
    <div className="flex gap-3 group">
      <Avatar user={comment.author} size="sm" />
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm font-medium text-white">{comment.author?.name}</span>
          <span className="text-xs text-slate-600">{timeAgo(comment.createdAt)}</span>
          {comment.edited && <span className="text-xs text-slate-600 italic">(edited)</span>}
        </div>

        {/* Body */}
        {isEditing ? (
          <div className="space-y-2">
            <textarea
              ref={textareaRef}
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              onKeyDown={handleKeyDown}
              rows={3}
              className="w-full bg-slate-800 border border-indigo-500 rounded-xl px-3 py-2 text-white text-sm resize-none focus:outline-none"
            />
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveEdit}
                disabled={loading || !editText.trim()}
                className="text-xs px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg transition-colors"
              >
                {loading ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={() => { setIsEditing(false); setEditText(comment.text) }}
                className="text-xs px-3 py-1.5 text-slate-400 hover:text-white transition-colors"
              >
                Cancel
              </button>
              <span className="text-xs text-slate-600">Ctrl+Enter to save</span>
            </div>
          </div>
        ) : (
          <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl px-3 py-2.5">
            <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {comment.text}
            </p>
          </div>
        )}

        {/* Actions */}
        {!isEditing && (
          <div className="flex items-center gap-3 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {isAuthor && (
              <button
                onClick={() => setIsEditing(true)}
                className="text-xs text-slate-500 hover:text-indigo-400 transition-colors"
              >
                Edit
              </button>
            )}
            {canDelete && (
              <button
                onClick={() => onDelete(comment._id)}
                className="text-xs text-slate-500 hover:text-red-400 transition-colors"
              >
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Main Comments Panel ──────────────────────────────────────────────────────
export default function CommentsPanel({ taskId, taskTitle }) {
  const { user } = useAuth()
  const { subscribe } = useWS()
  const toast = useToast()

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const bottomRef = useRef(null)
  const textareaRef = useRef(null)

  // Load comments
  const load = async () => {
    try {
      const res = await commentsAPI.getAll(taskId)
      setComments(res.data.comments)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [taskId])

  // Scroll to bottom when new comments arrive
  useEffect(() => {
    if (!loading) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [comments.length, loading])

  // Real-time updates via WebSocket
  useEffect(() => {
    return subscribe('comments-panel', (msg) => {
      if (msg.payload?.taskId !== taskId) return

      if (msg.type === 'comment_added') {
        setComments((prev) => {
          // Avoid duplicates if current user posted it (already added optimistically)
          const exists = prev.find((c) => c._id === msg.payload.comment._id)
          if (exists) return prev
          return [...prev, msg.payload.comment]
        })
      }

      if (msg.type === 'comment_edited') {
        setComments((prev) =>
          prev.map((c) => c._id === msg.payload.comment._id ? msg.payload.comment : c)
        )
      }

      if (msg.type === 'comment_deleted') {
        setComments((prev) => prev.filter((c) => c._id !== msg.payload.commentId))
      }
    })
  }, [subscribe, taskId])

  const handleSubmit = async () => {
    if (!text.trim() || submitting) return
    setSubmitting(true)

    // Optimistic update — show comment immediately
    const optimistic = {
      _id: `temp-${Date.now()}`,
      text: text.trim(),
      author: user,
      createdAt: new Date().toISOString(),
      edited: false,
    }
    setComments((prev) => [...prev, optimistic])
    setText('')

    try {
      const res = await commentsAPI.add(taskId, optimistic.text)
      // Replace optimistic with real comment from server
      setComments((prev) =>
        prev.map((c) => c._id === optimistic._id ? res.data.comment : c)
      )
    } catch (err) {
      // Remove optimistic comment on error
      setComments((prev) => prev.filter((c) => c._id !== optimistic._id))
      setText(optimistic.text)
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
      textareaRef.current?.focus()
    }
  }

  const handleEdit = async (commentId, newText) => {
    try {
      const res = await commentsAPI.edit(commentId, newText)
      setComments((prev) =>
        prev.map((c) => c._id === commentId ? res.data.comment : c)
      )
    } catch (err) {
      toast.error('Failed to edit comment')
      throw err
    }
  }

  const handleDelete = async (commentId) => {
    // Optimistic remove
    setComments((prev) => prev.filter((c) => c._id !== commentId))
    try {
      await commentsAPI.delete(commentId)
    } catch (err) {
      toast.error('Failed to delete comment')
      load() // reload to restore
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) handleSubmit()
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4 flex-shrink-0">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-indigo-400">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
        <h3 className="text-sm font-semibold text-slate-300 uppercase tracking-wider">
          Comments
        </h3>
        <span className="text-xs px-2 py-0.5 bg-slate-700 rounded-full text-slate-400">
          {comments.length}
        </span>
      </div>

      {/* Comment list */}
      <div className="flex-1 overflow-y-auto space-y-5 pr-1 min-h-0">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner size="md" />
          </div>
        ) : comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mb-3">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-6 h-6 text-slate-600">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <p className="text-slate-500 text-sm">No comments yet</p>
            <p className="text-slate-600 text-xs mt-1">Be the first to comment</p>
          </div>
        ) : (
          comments.map((comment) => (
            <CommentItem
              key={comment._id}
              comment={comment}
              currentUser={user}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="flex-shrink-0 mt-4 pt-4 border-t border-slate-700/60">
        <div className="flex gap-3">
          <Avatar user={user} size="sm" />
          <div className="flex-1">
            <textarea
              ref={textareaRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Write a comment... (Ctrl+Enter to post)"
              rows={3}
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-white text-sm placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500 transition-colors"
            />
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs text-slate-600">
                {text.length}/2000
              </span>
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || submitting || text.length > 2000}
                className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors font-medium"
              >
                {submitting ? (
                  <Spinner size="sm" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
