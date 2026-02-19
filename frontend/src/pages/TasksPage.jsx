import { useState, useEffect } from 'react'
import { tasksAPI, projectsAPI, usersAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useWS } from '../context/WSContext'
import { Button, Card, Spinner, EmptyState, Select } from '../components/ui'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'

export default function TasksPage() {
  const { user } = useAuth()
  const toast = useToast()
  const { subscribe } = useWS()

  const [tasks, setTasks] = useState([])
  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const [filters, setFilters] = useState({
    status: '', priority: '', project: '',
    assignee: user.role === 'user' ? user._id : '',
    search: '',
  })

  const canCreate = user.role !== 'user'

  const load = async () => {
    try {
      const params = {}
      if (filters.status) params.status = filters.status
      if (filters.priority) params.priority = filters.priority
      if (filters.project) params.project = filters.project
      if (filters.assignee) params.assignee = filters.assignee
      if (filters.search) params.search = filters.search

      const [taskRes, projRes, userRes] = await Promise.all([
        tasksAPI.getAll(params),
        projectsAPI.getAll(),
        usersAPI.getAll(),
      ])
      setTasks(taskRes.data.tasks)
      setProjects(projRes.data.projects)
      setUsers(userRes.data.users)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [filters])

  useEffect(() => {
    return subscribe('tasks-page', (msg) => {
      if (['task_created', 'task_updated', 'task_deleted'].includes(msg.type)) load()
    })
  }, [subscribe, filters])

  const handleCreate = async (data) => {
    const res = await tasksAPI.create(data)
    setTasks((t) => [res.data.task, ...t])
    toast.success('Task created!')
    setShowForm(false)
  }

  const handleUpdate = async (id, data) => {
    const res = await tasksAPI.update(id, data)
    setTasks((t) => t.map((task) => task._id === id ? res.data.task : task))
    toast.success('Task updated')
  }

  const handleDelete = async (id) => {
    await tasksAPI.delete(id)
    setTasks((t) => t.filter((task) => task._id !== id))
    toast.success('Task deleted')
  }

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  const grouped = {
    'todo': tasks.filter((t) => t.status === 'todo'),
    'in-progress': tasks.filter((t) => t.status === 'in-progress'),
    'done': tasks.filter((t) => t.status === 'done'),
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">{user.role === 'user' ? 'My Tasks' : 'All Tasks'}</h1>
          <p className="text-slate-400 text-sm mt-0.5">{tasks.length} task{tasks.length !== 1 ? 's' : ''} found</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Task
          </Button>
        )}
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-48">
            <label className="text-xs text-slate-400 mb-1.5 block uppercase tracking-wider">Search</label>
            <input
              value={filters.search}
              onChange={(e) => setFilter('search', e.target.value)}
              placeholder="Search tasks..."
              className="w-full bg-slate-800 border border-slate-600 rounded-xl px-4 py-2.5 text-white text-sm focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>
          <Select value={filters.status} onChange={(e) => setFilter('status', e.target.value)} label="Status" className="w-36">
            <option value="">All Status</option>
            <option value="todo">Todo</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </Select>
          <Select value={filters.priority} onChange={(e) => setFilter('priority', e.target.value)} label="Priority" className="w-36">
            <option value="">All Priority</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>
          <Select value={filters.project} onChange={(e) => setFilter('project', e.target.value)} label="Project" className="w-44">
            <option value="">All Projects</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>
          {user.role !== 'user' && (
            <Select value={filters.assignee} onChange={(e) => setFilter('assignee', e.target.value)} label="Assignee" className="w-40">
              <option value="">All Members</option>
              {users.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
            </Select>
          )}
          {Object.values(filters).some(Boolean) && (
            <Button variant="ghost" size="sm" onClick={() => setFilters({ status: '', priority: '', project: '', assignee: user.role === 'user' ? user._id : '', search: '' })}>
              Clear
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState
          title="No tasks found"
          description="Try adjusting your filters, or create a new task."
          action={canCreate && <Button onClick={() => setShowForm(true)}>Create Task</Button>}
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([status, items]) => {
            if (items.length === 0) return null
            const labels = { 'todo': 'Todo', 'in-progress': 'In Progress', 'done': 'Done' }
            return (
              <div key={status}>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  {labels[status]}
                  <span className="px-2 py-0.5 bg-slate-800 rounded-full text-xs font-medium text-slate-500">{items.length}</span>
                </h2>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {items.map((task) => (
                    <TaskCard key={task._id} task={task} onUpdate={handleUpdate} onDelete={handleDelete} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <TaskForm
          onClose={() => setShowForm(false)}
          onCreate={handleCreate}
          projects={projects}
          users={users}
        />
      )}
    </div>
  )
}
