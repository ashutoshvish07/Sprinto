import { useState, useEffect } from 'react'
import { logsAPI, projectsAPI } from '../api/services'
import { useWS } from '../context/WSContext'
import { Card, Avatar, Badge, Spinner, Select } from '../components/ui'
import { timeAgo } from '../utils/helpers'

const TYPE_ICONS = {
  task: { icon: '◉', color: 'text-sky-400', bg: 'bg-sky-500/10' },
  project: { icon: '◈', color: 'text-purple-400', bg: 'bg-purple-500/10' },
  user: { icon: '◎', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  system: { icon: '◆', color: 'text-amber-400', bg: 'bg-amber-500/10' },
}

export default function LogsPage() {
  const { subscribe } = useWS()
  const [logs, setLogs] = useState([])
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [filterProject, setFilterProject] = useState('')

  const load = async (p = 1) => {
    setLoading(true)
    try {
      const params = { page: p, limit: 20 }
      if (filterProject) params.project = filterProject

      const [logRes, projRes] = await Promise.all([
        logsAPI.getAll(params),
        projectsAPI.getAll(),
      ])
      setLogs(logRes.data.logs)
      setTotalPages(logRes.data.pages)
      setProjects(projRes.data.projects)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load(page) }, [page, filterProject])

  useEffect(() => {
    return subscribe('logs', (msg) => {
      if (['task_created', 'task_updated', 'task_deleted', 'project_created'].includes(msg.type)) {
        if (page === 1) load(1)
      }
    })
  }, [subscribe, page])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity Logs</h1>
          <p className="text-slate-400 text-sm mt-0.5">Complete audit trail of all workspace activity</p>
        </div>
        <Select value={filterProject} onChange={(e) => { setFilterProject(e.target.value); setPage(1) }} className="w-48">
          <option value="">All Projects</option>
          {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
        </Select>
      </div>

      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16 text-slate-500">No activity logs yet</div>
        ) : (
          <div className="divide-y divide-slate-700/40">
            {logs.map((log) => {
              const typeConf = TYPE_ICONS[log.targetType] || TYPE_ICONS.task
              return (
                <div key={log._id} className="flex items-start gap-4 px-6 py-4 hover:bg-slate-800/20 transition-colors">
                  <div className="flex-shrink-0 pt-0.5">
                    {log.user ? <Avatar user={log.user} /> : (
                      <div className="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center text-slate-400 text-xs">?</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 leading-relaxed">
                      <span className="text-white font-medium">{log.user?.name || 'System'}</span>{' '}
                      <span className="text-slate-400">{log.action}</span>{' '}
                      <span className="text-indigo-300">"{log.target}"</span>
                      {log.project && (
                        <> <span className="text-slate-600">in</span>{' '}
                        <span className="text-slate-400">{log.project.name}</span></>
                      )}
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">{timeAgo(log.createdAt)} · {new Date(log.createdAt).toLocaleString()}</p>
                  </div>
                  <div className={`flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center ${typeConf.bg}`}>
                    <span className={`text-sm ${typeConf.color}`}>{typeConf.icon}</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-4 py-2 text-sm rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="px-4 py-2 text-sm rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
