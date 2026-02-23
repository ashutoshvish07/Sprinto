import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTasks, createTask, updateTask, deleteTask, selectTasks, selectTasksLoading, wsTaskUpdated, wsTaskCreated, wsTaskDeleted } from '../store/slices/tasksSlice'
import { fetchProjects, selectProjects, selectProjectsLastFetched, PROJECTS_CACHE_TTL } from '../store/slices/projectsSlice'
import { fetchUsers, selectUsers, selectUsersLastFetched, USERS_CACHE_TTL } from '../store/slices/usersSlice'
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
  const dispatch = useDispatch()

  const tasks = useSelector(selectTasks)
  const projects = useSelector(selectProjects)
  const users = useSelector(selectUsers)
  const loading = useSelector(selectTasksLoading)
  const projectsLastFetched = useSelector(selectProjectsLastFetched)
  const usersLastFetched = useSelector(selectUsersLastFetched)

  const [showForm, setShowForm] = useState(false)
  const [filters, setFilters] = useState({
    status: '', priority: '', project: '',
    assignee: user.role === 'user' ? user._id : '',
    search: '',
  })
  const canCreate = user.role !== 'user'

  useEffect(() => {
    const now = Date.now()
    if (!projectsLastFetched || now - projectsLastFetched > PROJECTS_CACHE_TTL) dispatch(fetchProjects())
    if (!usersLastFetched || now - usersLastFetched > USERS_CACHE_TTL) dispatch(fetchUsers())
  }, [])

  // Fetch tasks when filters change
  useEffect(() => {
    const params = {}
    if (filters.status) params.status = filters.status
    if (filters.priority) params.priority = filters.priority
    if (filters.project) params.project = filters.project
    if (filters.assignee) params.assignee = filters.assignee
    if (filters.search) params.search = filters.search
    dispatch(fetchTasks(params))
  }, [filters])

  // WS — patch store directly
  useEffect(() => {
    return subscribe('tasks-page', (msg) => {
      if (msg.type === 'task_updated') dispatch(wsTaskUpdated(msg.payload.task))
      if (msg.type === 'task_created') dispatch(wsTaskCreated(msg.payload.task))
      if (msg.type === 'task_deleted') dispatch(wsTaskDeleted(msg.payload.taskId))
    })
  }, [subscribe, dispatch])

  const handleCreate = async (data) => {
    const result = await dispatch(createTask(data))
    if (createTask.fulfilled.match(result)) {
      toast.success('Task created!')
      setShowForm(false)
    }
  }

  const handleUpdate = async (id, data) => {
    const result = await dispatch(updateTask({ id, data }))
    if (updateTask.fulfilled.match(result)) toast.success('Task updated')
  }

  const handleDelete = async (id) => {
    await dispatch(deleteTask(id))
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

      {loading && tasks.length === 0 ? (
        <div className="flex justify-center py-20"><Spinner size="lg" /></div>
      ) : tasks.length === 0 ? (
        <EmptyState title="No tasks found" description="Try adjusting your filters, or create a new task."
          action={canCreate && <Button onClick={() => setShowForm(true)}>Create Task</Button>} />
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
        <TaskForm onClose={() => setShowForm(false)} onCreate={handleCreate} projects={projects} users={users} />
      )}
    </div>
  )
}
