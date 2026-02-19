import { useState, useEffect } from 'react'
import { projectsAPI, usersAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { useWS } from '../context/WSContext'
import { Button, Modal, Input, Textarea, Card, Avatar, Badge, EmptyState, ConfirmDialog, Spinner } from '../components/ui'
import { formatDate, roleConfig, PROJECT_COLORS } from '../utils/helpers'

function ProjectForm({ onClose, onCreate, users, currentUser }) {
  const [form, setForm] = useState({
    name: '', description: '', color: PROJECT_COLORS[0],
    members: [currentUser._id],
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const toggleMember = (id) => {
    set('members', form.members.includes(id)
      ? form.members.filter((m) => m !== id)
      : [...form.members, id]
    )
  }

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Project name is required'); return }
    setLoading(true)
    try {
      await onCreate(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Create New Project" onClose={onClose} wide>
      <div className="space-y-4">
        <Input
          label="Project Name *"
          value={form.name}
          onChange={(e) => { set('name', e.target.value); setError('') }}
          placeholder="My Awesome Project"
          error={error}
        />
        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="What's this project about?"
          rows={2}
        />
        <div>
          <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Color</label>
          <div className="flex gap-2 flex-wrap">
            {PROJECT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set('color', c)}
                className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Team Members</label>
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {users.map((u) => (
              <label key={u._id} className="flex items-center gap-3 cursor-pointer group py-1">
                <input
                  type="checkbox"
                  checked={form.members.includes(u._id)}
                  onChange={() => toggleMember(u._id)}
                  disabled={u._id === currentUser._id}
                  className="w-4 h-4 accent-indigo-500"
                />
                <Avatar user={u} size="sm" />
                <span className="text-sm text-slate-300 flex-1">{u.name}</span>
                <Badge className={roleConfig[u.role].badgeClass}>{roleConfig[u.role].label}</Badge>
              </label>
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">Create Project</Button>
        </div>
      </div>
    </Modal>
  )
}

function ProjectCard({ project, onDelete, canDelete }) {
  const [showConfirm, setShowConfirm] = useState(false)
  const total = project.taskCounts?.total || 0
  const done = project.taskCounts?.done || 0
  const pct = total ? Math.round((done / total) * 100) : 0

  return (
    <>
      <Card className="p-6 hover:border-slate-600 transition-all group relative overflow-hidden" hover>
        {/* Top color bar */}
        <div className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl" style={{ background: project.color }} />

        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-white truncate">{project.name}</h3>
            <p className="text-xs text-slate-500 mt-0.5">Since {formatDate(project.createdAt)}</p>
          </div>
          {canDelete && (
            <button
              onClick={() => setShowConfirm(true)}
              className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 transition-all p-1 ml-2 flex-shrink-0"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
              </svg>
            </button>
          )}
        </div>

        <p className="text-sm text-slate-400 mb-5 line-clamp-2">{project.description || 'No description'}</p>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-slate-500">Progress</span>
            <span className="text-slate-300">{pct}%</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: project.color }} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between">
          <div className="flex -space-x-2">
            {project.members?.slice(0, 5).map((m) => (
              <div key={m._id} className="ring-2 ring-slate-900 rounded-full">
                <Avatar user={m} size="sm" />
              </div>
            ))}
            {project.members?.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-slate-700 ring-2 ring-slate-900 flex items-center justify-center text-xs text-slate-400">
                +{project.members.length - 5}
              </div>
            )}
          </div>
          <span className="text-xs text-slate-600">{total} tasks · {done} done</span>
        </div>
      </Card>

      {showConfirm && (
        <ConfirmDialog
          title="Delete Project"
          message={`Delete "${project.name}"? All tasks in this project will also be deleted. This cannot be undone.`}
          onConfirm={() => { onDelete(project._id); setShowConfirm(false) }}
          onCancel={() => setShowConfirm(false)}
          danger
        />
      )}
    </>
  )
}

export default function ProjectsPage() {
  const { user } = useAuth()
  const toast = useToast()
  const { subscribe } = useWS()

  const [projects, setProjects] = useState([])
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)

  const canCreate = user.role !== 'user'
  const canDelete = user.role === 'admin'

  const load = async () => {
    try {
      const [projRes, userRes] = await Promise.all([projectsAPI.getAll(), usersAPI.getAll()])
      setProjects(projRes.data.projects)
      setUsers(userRes.data.users)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  useEffect(() => {
    return subscribe('projects', (msg) => {
      if (['project_created', 'project_updated', 'project_deleted'].includes(msg.type)) {
        load()
      }
    })
  }, [subscribe])

  const handleCreate = async (data) => {
    const res = await projectsAPI.create(data)
    setProjects((p) => [res.data.project, ...p])
    toast.success('Project created!')
  }

  const handleDelete = async (id) => {
    await projectsAPI.delete(id)
    setProjects((p) => p.filter((proj) => proj._id !== id))
    toast.success('Project deleted')
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Projects</h1>
          <p className="text-slate-400 text-sm mt-0.5">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <Button onClick={() => setShowForm(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            New Project
          </Button>
        )}
      </div>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects yet"
          description="Create your first project to start organizing tasks and collaborating with your team."
          action={canCreate && <Button onClick={() => setShowForm(true)}>Create Project</Button>}
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {projects.map((p) => (
            <ProjectCard key={p._id} project={p} onDelete={handleDelete} canDelete={canDelete} />
          ))}
        </div>
      )}

      {showForm && (
        <ProjectForm
          onClose={() => setShowForm(false)}
          onCreate={handleCreate}
          users={users}
          currentUser={user}
        />
      )}
    </div>
  )
}
