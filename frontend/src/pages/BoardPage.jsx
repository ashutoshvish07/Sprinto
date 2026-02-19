import { useState, useEffect, useRef } from 'react'
import { tasksAPI, projectsAPI, usersAPI } from '../api/services'
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

  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [dragTask, setDragTask] = useState(null)
  const [dragOver, setDragOver] = useState(null)
  const canCreate = user.role !== 'user'

  const loadData = async () => {
    try {
      const [projRes, userRes] = await Promise.all([
        projectsAPI.getAll(),
        usersAPI.getAll(),
      ])
      setProjects(projRes.data.projects)
      setUsers(userRes.data.users)
      if (!selectedProject && projRes.data.projects.length > 0) {
        setSelectedProject(projRes.data.projects[0]._id)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async () => {
    if (!selectedProject) return
    try {
      const res = await tasksAPI.getAll({ project: selectedProject })
      setTasks(res.data.tasks)
    } catch (err) {
      console.error(err)
    }
  }

  useEffect(() => { loadData() }, [])
  useEffect(() => { loadTasks() }, [selectedProject])

  // Real-time updates
  useEffect(() => {
    return subscribe('board', (msg) => {
      if (['task_created', 'task_updated', 'task_deleted'].includes(msg.type)) {
        loadTasks()
        if (msg.type === 'task_created') toast.info(`${msg.payload.user} created a new task`)
        if (msg.type === 'task_updated') toast.info(`${msg.payload.user} updated a task`)
      }
    })
  }, [subscribe, selectedProject])

  const handleCreate = async (data) => {
    const res = await tasksAPI.create(data)
    setTasks((t) => [...t, res.data.task])
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

  // Drag & Drop
  const handleDragStart = (task) => setDragTask(task)
  const handleDragOver = (e, col) => { e.preventDefault(); setDragOver(col) }
  const handleDrop = async (col) => {
    if (dragTask && dragTask.status !== col) {
      await handleUpdate(dragTask._id, { status: col })
    }
    setDragTask(null)
    setDragOver(null)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  const currentProject = projects.find((p) => p._id === selectedProject)

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Project Tabs */}
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
        {projects.length === 0 && (
          <p className="text-slate-500 text-sm">No projects yet</p>
        )}
      </div>

      {/* Columns */}
      {projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {COLUMNS.map((col) => {
            const sc = statusConfig[col]
            const colTasks = tasks.filter((t) => t.status === col)
            const isDragTarget = dragOver === col

            return (
              <div
                key={col}
                className={`rounded-2xl border min-h-72 flex flex-col transition-all ${
                  isDragTarget ? 'border-indigo-500/50 bg-indigo-500/5' : `${sc.borderClass} bg-slate-900/40`
                }`}
                onDragOver={(e) => handleDragOver(e, col)}
                onDrop={() => handleDrop(col)}
                onDragLeave={() => setDragOver(null)}
              >
                {/* Column header */}
                <div className="p-4 border-b border-slate-700/40 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-semibold ${sc.badgeClass.split(' ')[1]}`}>{sc.label}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sc.badgeClass}`}>{colTasks.length}</span>
                  </div>
                </div>

                {/* Tasks */}
                <div className="p-3 space-y-3 flex-1 overflow-y-auto">
                  {colTasks.map((task) => (
                    <div
                      key={task._id}
                      draggable
                      onDragStart={() => handleDragStart(task)}
                      className="cursor-grab active:cursor-grabbing"
                    >
                      <TaskCard task={task} onUpdate={handleUpdate} onDelete={handleDelete} />
                    </div>
                  ))}
                  {colTasks.length === 0 && (
                    <div className="flex items-center justify-center h-20 text-slate-700 text-sm">
                      Drop tasks here
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      ) : (
        <EmptyState
          title="No projects yet"
          description="Create a project first to start managing tasks on the board."
        />
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
