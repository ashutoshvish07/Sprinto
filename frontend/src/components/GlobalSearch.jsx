import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { searchAPI } from '../api/services'
import { Avatar, Badge } from './ui'
import { statusConfig, priorityConfig } from '../utils/helpers'

// ─── Result Item Components ───────────────────────────────────────────────────

function TaskResult({ task, isActive, onClick }) {
  const sc = statusConfig[task.status]
  const pc = priorityConfig[task.priority]
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-colors ${
        isActive ? 'bg-indigo-600/20' : 'hover:bg-slate-800/60'
      }`}
    >
      <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${pc.dotClass}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{task.title}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.badgeClass}`}>{sc.label}</span>
          {task.project && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: task.project.color }} />
              {task.project.name}
            </span>
          )}
          {task.assignee && (
            <span className="text-xs text-slate-500">{task.assignee.name}</span>
          )}
        </div>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-600 flex-shrink-0 mt-1">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}

function ProjectResult({ project, isActive, onClick }) {
  const total = project.taskCounts?.total || 0
  const done = project.taskCounts?.done || 0
  const pct = total ? Math.round((done / total) * 100) : 0
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive ? 'bg-indigo-600/20' : 'hover:bg-slate-800/60'
      }`}
    >
      <div className="w-8 h-8 rounded-lg flex-shrink-0" style={{ background: `${project.color}30` }}>
        <div className="w-full h-full flex items-center justify-center">
          <div className="w-3 h-3 rounded-sm" style={{ background: project.color }} />
        </div>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{project.name}</p>
        <p className="text-xs text-slate-500 mt-0.5">{total} tasks · {pct}% done</p>
      </div>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5 text-slate-600 flex-shrink-0">
        <path d="M9 18l6-6-6-6" />
      </svg>
    </button>
  )
}

function UserResult({ user, isActive, onClick }) {
  const roleColors = { admin: '#6366f1', manager: '#0ea5e9', user: '#10b981' }
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive ? 'bg-indigo-600/20' : 'hover:bg-slate-800/60'
      }`}
    >
      <Avatar user={user} size="sm" />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white font-medium truncate">{user.name}</p>
        <p className="text-xs text-slate-500 truncate">{user.email}</p>
      </div>
      <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
        style={{ background: `${roleColors[user.role]}20`, color: roleColors[user.role] }}>
        {user.role}
      </span>
    </button>
  )
}

function SectionHeader({ icon, label, count }) {
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-slate-800/60">
      <span className="text-xs">{icon}</span>
      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{label}</span>
      <span className="text-xs text-slate-600 ml-auto">{count}</span>
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function GlobalSearch({ onClose }) {
  const navigate = useNavigate()
  const inputRef = useRef(null)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState({ tasks: [], projects: [], users: [] })
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef(null)

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  // Debounced search
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (query.trim().length < 2) {
      setResults({ tasks: [], projects: [], users: [] })
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        const { data } = await searchAPI.search(query)
        setResults(data.results)
        setActiveIndex(0)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 300)

    return () => clearTimeout(debounceRef.current)
  }, [query])

  // Build flat list of all results for keyboard nav
  const allItems = [
    ...results.tasks.map((t) => ({ type: 'task', data: t })),
    ...results.projects.map((p) => ({ type: 'project', data: p })),
    ...results.users.map((u) => ({ type: 'user', data: u })),
  ]

  const handleSelect = useCallback((item) => {
    if (item.type === 'task') {
      navigate(`/tasks/${item.data._id}`)   // ← goes to full task detail page
    } else if (item.type === 'project') {
      navigate('/projects')
    } else if (item.type === 'user') {
      navigate('/team')
    }
    onClose()
  }, [navigate, onClose])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => Math.min(i + 1, allItems.length - 1))
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => Math.max(i - 1, 0))
      }
      if (e.key === 'Enter' && allItems[activeIndex]) {
        handleSelect(allItems[activeIndex])
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [allItems, activeIndex, handleSelect, onClose])

  const hasResults = allItems.length > 0
  const isEmpty = query.trim().length >= 2 && !loading && !hasResults

  // Offset index per section for active tracking
  const taskOffset = 0
  const projectOffset = results.tasks.length
  const userOffset = results.tasks.length + results.projects.length

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

      <div
        className="relative w-full max-w-2xl bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slideUp"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-4 border-b border-slate-700/60">
          {loading ? (
            <svg className="w-5 h-5 text-indigo-400 animate-spin flex-shrink-0" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-5 h-5 text-slate-500 flex-shrink-0">
              <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
            </svg>
          )}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tasks, projects, people..."
            className="flex-1 bg-transparent text-white text-base placeholder-slate-500 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-slate-500 hover:text-slate-300 transition-colors">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
          <kbd className="hidden sm:flex text-xs text-slate-600 bg-slate-800 px-2 py-1 rounded-lg border border-slate-700">Esc</kbd>
        </div>

        {/* Results */}
        <div className="max-h-[60vh] overflow-y-auto">

          {/* Empty state */}
          {!query.trim() && (
            <div className="py-12 text-center">
              <p className="text-slate-500 text-sm">Type to search tasks, projects and people</p>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-slate-600">
                <span>↑↓ Navigate</span>
                <span>↵ Select</span>
                <span>Esc Close</span>
              </div>
            </div>
          )}

          {/* No results */}
          {isEmpty && (
            <div className="py-12 text-center">
              <p className="text-slate-400 text-sm">No results for "<span className="text-white">{query}</span>"</p>
              <p className="text-slate-600 text-xs mt-1">Try a different keyword</p>
            </div>
          )}

          {/* Tasks */}
          {results.tasks.length > 0 && (
            <div>
              <SectionHeader icon="✓" label="Tasks" count={results.tasks.length} />
              {results.tasks.map((task, i) => (
                <TaskResult
                  key={task._id}
                  task={task}
                  isActive={activeIndex === taskOffset + i}
                  onClick={() => handleSelect({ type: 'task', data: task })}
                />
              ))}
            </div>
          )}

          {/* Projects */}
          {results.projects.length > 0 && (
            <div>
              <SectionHeader icon="◈" label="Projects" count={results.projects.length} />
              {results.projects.map((project, i) => (
                <ProjectResult
                  key={project._id}
                  project={project}
                  isActive={activeIndex === projectOffset + i}
                  onClick={() => handleSelect({ type: 'project', data: project })}
                />
              ))}
            </div>
          )}

          {/* Users */}
          {results.users.length > 0 && (
            <div>
              <SectionHeader icon="◉" label="People" count={results.users.length} />
              {results.users.map((user, i) => (
                <UserResult
                  key={user._id}
                  user={user}
                  isActive={activeIndex === userOffset + i}
                  onClick={() => handleSelect({ type: 'user', data: user })}
                />
              ))}
            </div>
          )}

          {/* Total count */}
          {hasResults && (
            <div className="px-4 py-2.5 border-t border-slate-800/60 flex items-center justify-between">
              <p className="text-xs text-slate-600">{allItems.length} result{allItems.length !== 1 ? 's' : ''} found</p>
              <p className="text-xs text-slate-600">↑↓ to navigate · ↵ to open</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
