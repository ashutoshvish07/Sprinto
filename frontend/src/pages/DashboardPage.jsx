import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { tasksAPI, projectsAPI, logsAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useWS } from '../context/WSContext'
import { Card, Avatar, Badge, Spinner } from '../components/ui'
import { timeAgo, statusConfig, priorityConfig, roleConfig } from '../utils/helpers'

function StatCard({ label, value, sub, color, icon }) {
  return (
    <Card className="p-5 relative overflow-hidden hover:border-slate-600 transition-colors">
      <div className="absolute top-0 right-0 w-28 h-28 rounded-full opacity-[0.07] -translate-y-10 translate-x-10" style={{ background: color }} />
      <div className="flex items-start justify-between mb-4">
        <div className="text-3xl font-bold text-white">{value}</div>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg" style={{ background: `${color}20`, color }}>
          {icon}
        </div>
      </div>
      <p className="text-sm text-slate-300 font-medium">{label}</p>
      {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
    </Card>
  )
}

export default function DashboardPage() {
  const { user } = useAuth()
  const { subscribe } = useWS()
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [logs, setLogs] = useState([])
  const [myTasks, setMyTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    try {
      const [statsRes, projectsRes, logsRes, myTasksRes] = await Promise.all([
        tasksAPI.getStats(),
        projectsAPI.getAll(),
        logsAPI.getAll({ limit: 8 }),
        tasksAPI.getAll({ assignee: user._id }),
      ])
      setStats(statsRes.data.stats)
      setProjects(projectsRes.data.projects)
      setLogs(logsRes.data.logs)
      setMyTasks(myTasksRes.data.tasks)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Refresh on WS events
  useEffect(() => {
    return subscribe('dashboard', (msg) => {
      if (['task_created', 'task_updated', 'task_deleted', 'project_created'].includes(msg.type)) {
        load()
      }
    })
  }, [subscribe])

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const chartData = projects.map((p) => ({
    name: p.name.split(' ')[0],
    todo: p.taskCounts?.todo || 0,
    inProgress: p.taskCounts?.inProgress || 0,
    done: p.taskCounts?.done || 0,
    color: p.color,
  }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white">
          Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user.name.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1 text-sm">Here's an overview of your workspace.</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <StatCard label="Total Tasks" value={stats.total} color="#6366f1" icon="✦" sub={`${stats.done} done`} />
          <StatCard label="In Progress" value={stats.inProgress} color="#0ea5e9" icon="⟳" sub="Active" />
          <StatCard label="Todo" value={stats.todo} color="#f59e0b" icon="◎" sub="Pending" />
          <StatCard label="My Tasks" value={stats.myTasks} color="#10b981" icon="◉" sub="Assigned to you" />
          <StatCard label="Overdue" value={stats.overdue} color="#f43f5e" icon="⚠" sub="Need attention" />
          <StatCard label="Projects" value={projects.length} color="#8b5cf6" icon="◈" sub="Active" />
        </div>
      )}

      <div className="grid lg:grid-cols-5 gap-6">
        {/* Project progress chart */}
        <Card className="lg:col-span-3 p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6">Tasks by Project</h2>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} barSize={12} barGap={4}>
                <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 12, color: '#fff', fontSize: 12 }}
                  cursor={{ fill: 'rgba(99,102,241,0.05)' }}
                />
                <Bar dataKey="done" name="Done" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="inProgress" name="In Progress" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                <Bar dataKey="todo" name="Todo" fill="#475569" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-slate-500 text-sm text-center py-10">No data yet</p>
          )}
        </Card>

        {/* Activity feed */}
        <Card className="lg:col-span-2 p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">Recent Activity</h2>
          <div className="space-y-4">
            {logs.map((log) => (
              <div key={log._id} className="flex gap-3">
                <Avatar user={log.user} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    <span className="text-white font-medium">{log.user?.name}</span>{' '}
                    <span className="text-slate-400">{log.action}</span>{' '}
                    <span className="text-indigo-400 truncate">"{log.target}"</span>
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{timeAgo(log.createdAt)}</p>
                </div>
              </div>
            ))}
            {logs.length === 0 && <p className="text-slate-600 text-sm">No activity yet</p>}
          </div>
        </Card>
      </div>

      {/* Project progress bars */}
      <Card className="p-6">
        <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-6">Project Progress</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((p) => {
            const total = p.taskCounts?.total || 0
            const done = p.taskCounts?.done || 0
            const pct = total ? Math.round((done / total) * 100) : 0
            return (
              <div key={p._id}>
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-sm text-white font-medium truncate">{p.name}</span>
                  </div>
                  <span className="text-xs text-slate-500 flex-shrink-0">{done}/{total}</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: p.color }} />
                </div>
                <p className="text-xs text-slate-600 mt-1">{pct}% complete</p>
              </div>
            )
          })}
        </div>
      </Card>

      {/* My tasks */}
      {myTasks.length > 0 && (
        <Card className="p-6">
          <h2 className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-5">My Tasks</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {myTasks.slice(0, 6).map((task) => {
              const sc = statusConfig[task.status]
              const pc = priorityConfig[task.priority]
              return (
                <div key={task._id} className="border border-slate-700/50 rounded-xl p-4 hover:border-slate-600 transition-colors bg-slate-800/30">
                  <div className="flex items-start gap-2 mb-2">
                    <div className={`w-2 h-2 rounded-full mt-1 flex-shrink-0 ${pc.dotClass}`} />
                    <p className="text-sm text-white font-medium leading-snug line-clamp-2">{task.title}</p>
                  </div>
                  <p className="text-xs text-slate-500 mb-3">{task.project?.name}</p>
                  <Badge className={sc.badgeClass}>{sc.label}</Badge>
                </div>
              )
            })}
          </div>
        </Card>
      )}
    </div>
  )
}
