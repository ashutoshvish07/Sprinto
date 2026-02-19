import { useState, useEffect } from 'react'
import { Modal, Input, Textarea, Select, Button } from './ui'
import { useAuth } from '../context/AuthContext'

export default function TaskForm({ onClose, onCreate, onUpdate, task, projects, users }) {
  const { user } = useAuth()
  const isEdit = !!task

  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    project: task?.project?._id || task?.project || projects[0]?._id || '',
    assignee: task?.assignee?._id || task?.assignee || '',
    priority: task?.priority || 'medium',
    status: task?.status || 'todo',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
    tags: task?.tags?.join(', ') || '',
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }))
    setErrors((e) => ({ ...e, [k]: '' }))
  }

  // Available members for selected project
  const selectedProject = projects.find((p) => p._id === form.project)
  const availableUsers = selectedProject
    ? users.filter((u) => selectedProject.members?.some((m) => (m._id || m) === u._id))
    : users

  const validate = () => {
    const errs = {}
    if (!form.title.trim()) errs.title = 'Title is required'
    if (!form.project) errs.project = 'Project is required'
    return errs
  }

  const handleSubmit = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setLoading(true)
    const payload = {
      ...form,
      tags: form.tags ? form.tags.split(',').map((t) => t.trim()).filter(Boolean) : [],
      assignee: form.assignee || undefined,
      dueDate: form.dueDate || undefined,
    }

    try {
      if (isEdit) {
        await onUpdate(task._id, payload)
      } else {
        await onCreate(payload)
      }
      onClose()
    } catch (err) {
      setErrors({ submit: err.response?.data?.message || 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title={isEdit ? 'Edit Task' : 'Create Task'} onClose={onClose} wide>
      <div className="space-y-4">
        <Input
          label="Title *"
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="What needs to be done?"
          error={errors.title}
        />

        <Textarea
          label="Description"
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
          placeholder="Add more details..."
          rows={3}
        />

        <div className="grid grid-cols-2 gap-4">
          <Select label="Project *" value={form.project} onChange={(e) => set('project', e.target.value)} error={errors.project}>
            <option value="">Select project</option>
            {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
          </Select>

          <Select label="Assign To" value={form.assignee} onChange={(e) => set('assignee', e.target.value)}>
            <option value="">Unassigned</option>
            {availableUsers.map((u) => <option key={u._id} value={u._id}>{u.name}</option>)}
          </Select>

          <Select label="Priority" value={form.priority} onChange={(e) => set('priority', e.target.value)}>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </Select>

          <Select label="Status" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="todo">Todo</option>
            <option value="in-progress">In Progress</option>
            <option value="done">Done</option>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Due Date"
            type="date"
            value={form.dueDate}
            onChange={(e) => set('dueDate', e.target.value)}
          />
          <Input
            label="Tags (comma separated)"
            value={form.tags}
            onChange={(e) => set('tags', e.target.value)}
            placeholder="frontend, api, bug..."
          />
        </div>

        {errors.submit && <p className="text-red-400 text-sm">{errors.submit}</p>}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} loading={loading} className="flex-1">
            {isEdit ? 'Save Changes' : 'Create Task'}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
