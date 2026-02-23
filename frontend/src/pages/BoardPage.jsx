import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { fetchTasks, createTask, updateTask, deleteTask, selectTasks, selectTasksLoading, selectTasksLastFetched, CACHE_TTL, wsTaskUpdated, wsTaskCreated, wsTaskDeleted } from '../store/slices/tasksSlice'
import { fetchProjects, selectProjects, selectProjectsLastFetched, PROJECTS_CACHE_TTL } from '../store/slices/projectsSlice'
import { fetchUsers, selectUsers, selectUsersLastFetched, USERS_CACHE_TTL } from '../store/slices/usersSlice'
import { useAuth } from '../context/AuthContext'
import { useWS } from '../context/WSContext'
import { useToast } from '../context/ToastContext'
import { Button, Spinner, EmptyState } from '../components/ui'
import TaskCard from '../components/TaskCard'
import TaskForm from '../components/TaskForm'
import { statusConfig } from '../utils/helpers'

const COLUMNS = ['todo', 'in-progress', 'done']

export default function BoardPage() {
  const { user } = useAuth()
  const { subscribe } = useWS()
  const toast = useToast()
  const dispatch = useDispatch()

  const projects = useSelector(selectProjects)
  const allTasks = useSelector(selectTasks)
  const users = useSelector(selectUsers)
  const loading = useSelector(selectTasksLoading)
  const tasksLastFetched = useSelector(selectTasksLastFetched)
  const projectsLastFetched = useSelector(selectProjectsLastFetched)
  const usersLastFetched = useSelector(selectUsersLastFetched)

  const [selectedProject, setSelectedProject] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [dragTask, setDragTask] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const canCreate = user.role !== 'user'

  // Only tasks for selected project
  const tasks = allTasks.filter((t) =>
    selectedProject ? t.project?._id === selectedProject || t.project === selectedProject : false
  )

  useEffect(() => {
    const now = Date.now()
    if (!projectsLastFetched || now - projectsLastFetched > PROJECTS_CACHE_TTL) {
      dispatch(fetchProjects())
    }
    if (!usersLastFetched || now - usersLastFetched > USERS_CACHE_TTL) {
      dispatch(fetchUsers())
    }
  }, [])

  // When project selected, load its tasks if not cached
  useEffect(() => {
    if (!selectedProject) return
    const now = Date.now()
    if (!tasksLastFetched || now - tasksLastFetched > CACHE_TTL) {
      dispatch(fetchTasks({ project: selectedProject }))
    }
  }, [selectedProject])

  // Auto-select first project
  useEffect(() => {
    if (projects.length > 0 && !selectedProject) {
      setSelectedProject(projects[0]._id)
    }
  }, [projects])

  // WS — update store directly, no API refetch
  useEffect(() => {
    return subscribe('board', (msg) => {
      if (msg.type === 'task_created') {
        dispatch(wsTaskCreated(msg.payload.task))
        toast.info(`${msg.payload.user} created a task`)
      }
      if (msg.type === 'task_updated') {
        dispatch(wsTaskUpdated(msg.payload.task))
      }
      if (msg.type === 'task_deleted') {
        dispatch(wsTaskDeleted(msg.payload.taskId))
      }
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

  const handleDragStart = (task) => setDragTask(task)
  const handleDragOver = (e, col) => { e.preventDefault(); setDragOver(col) }
  const handleDrop = async (col) => {
    if (dragTask && dragTask.status !== col) {
      await handleUpdate(dragTask._id, { status: col })
    }
    setDragTask(null)
    setDragOver(null)
  }

  if (loading && allTasks.length === 0) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-white">Kanban Board</h1>
          <p className="text-slate-400 text-sm mt-0.5">Drag & drop tasks to update status</p>
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

      <div className="flex gap-2 flex-wrap">
        {projects.map((p) => (
          <button
            key={p._id}
            onClick={() => setSelectedProject(p._id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              selectedProject === p._id ? 'text-white shadow-lg' : 'bg-slate-800/60 text-slate-400 hover:text-white'
            }`}
            style={selectedProject === p._id ? { background: p.color } : {}}
          >
            {p.name}
          </button>
        ))}
      </div>

      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            const sc = statusConfig[col]
            const colTasks = tasks.filter((t) => t.status === col)
            const isDragTarget = dragOver === col
            return (
              <div
                key={col}
                className={`rounded-2xl border min-h-72 flex flex-col transition-all ${isDragTarget ? 'border-indigo-500/50 bg-indigo-500/5' : `${sc.borderClass} bg-slate-900/40`}`}
                onDragOver={(e) => handleDragOver(e, col)}
                onDrop={() => handleDrop(col)}
                onDragLeave={() => setDragOver(null)}
              >
                <div className="p-4 border-b border-slate-700/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${sc.badgeClass.split(' ')[1]}`}>{sc.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.badgeClass}`}>{colTasks.length}</span>
                  </div>
                </div>
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => (
                    <div key={task._id} draggable onDragStart={() => handleDragStart(task)} className="cursor-grab active:cursor-grabbing">
                      <TaskCard task={task} onUpdate={handleUpdate} onDelete={handleDelete} />
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-slate-700 text-sm">Drop tasks here</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState title="No projects yet" description="Create a project first to start managing tasks on the board." />
      )}

      {showForm && (
        <TaskForm onClose={() => setShowForm(false)} onCreate={handleCreate} projects={projects} users={users} />
      )}
    </div>
  )
}
