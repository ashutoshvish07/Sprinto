import { useState, useEffect } from 'react'
import { usersAPI, tasksAPI } from '../api/services'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { Card, Avatar, Badge, Spinner, Button, Modal, Input, Select, ConfirmDialog } from '../components/ui'
import { roleConfig } from '../utils/helpers'

function EditUserModal({ user, onClose, onSave, currentUser }) {
  const [form, setForm] = useState({ name: user.name, email: user.email, role: user.role, color: user.color })
  const [loading, setLoading] = useState(false)
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899']

  const handleSave = async () => {
    setLoading(true)
    try {
      await onSave(user._id, form)
      onClose()
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Edit Member" onClose={onClose}>
      <div className="space-y-4">
        <Input label="Name" value={form.name} onChange={(e) => set('name', e.target.value)} />
        <Input label="Email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        {currentUser.role === 'admin' && (
          <Select label="Role" value={form.role} onChange={(e) => set('role', e.target.value)}>
            <option value="admin">Admin</option>
            <option value="manager">Manager</option>
            <option value="user">User</option>
          </Select>
        )}
        <div>
          <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">Avatar Color</label>
          <div className="flex gap-2">
            {COLORS.map((c) => (
              <button key={c} onClick={() => set('color', c)}
                className={`w-7 h-7 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900' : 'hover:scale-110'}`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSave} loading={loading} className="flex-1">Save Changes</Button>
        </div>
      </div>
    </Modal>
  )
}

function CreateUserModal({ onClose, onCreate }) {
  const COLORS = ['#6366f1', '#0ea5e9', '#10b981', '#f59e0b', '#f43f5e', '#8b5cf6', '#06b6d4', '#ec4899']
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'user', color: '#6366f1'
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleCreate = async () => {
    if (!form.name || !form.email || !form.password) {
      setError('All fields are required')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }
    setLoading(true)
    setError('')
    try {
      await onCreate(form)
      onClose()
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Create New User" onClose={onClose}>
      <div className="space-y-4">
        <Input
          label="Full Name *"
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="Alex Chen"
        />
        <Input
          label="Email *"
          type="email"
          value={form.email}
          onChange={(e) => set('email', e.target.value)}
          placeholder="alex@example.com"
        />
        <Input
          label="Password *"
          type="password"
          value={form.password}
          onChange={(e) => set('password', e.target.value)}
          placeholder="Min 6 characters"
        />
        <Select
          label="Role"
          value={form.role}
          onChange={(e) => set('role', e.target.value)}
        >
          <option value="user">User</option>
          <option value="manager">Manager</option>
        </Select>
        <div>
          <label className="block text-xs text-slate-400 mb-2 uppercase tracking-wider">
            Avatar Color
          </label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => set('color', c)}
                className={`w-7 h-7 rounded-full transition-transform ${form.color === c
                  ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-900'
                  : 'hover:scale-110'
                  }`}
                style={{ background: c }}
              />
            ))}
          </div>
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleCreate} loading={loading} className="flex-1">
            Create User
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function TeamPage() {
  const { user } = useAuth()
  const toast = useToast()
  const [users, setUsers] = useState([])
  const [stats, setStats] = useState({})
  const [loading, setLoading] = useState(true)
  const [editUser, setEditUser] = useState(null)
  const [deleteUser, setDeleteUser] = useState(null)
  const [showCreate, setShowCreate] = useState(false)

  const load = async () => {
    try {
      const res = await usersAPI.getAll()
      setUsers(res.data.users)
      // Load stats for each user
      const statsMap = {}
      await Promise.all(res.data.users.map(async (u) => {
        const sRes = await usersAPI.getStats(u._id)
        statsMap[u._id] = sRes.data.stats
      }))
      setStats(statsMap)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (id, data) => {
    const res = await usersAPI.update(id, data)
    setUsers((u) => u.map((usr) => usr._id === id ? res.data.user : usr))
    toast.success('Member updated')
  }

  const handleDelete = async (id) => {
    await usersAPI.delete(id)
    setUsers((u) => u.filter((usr) => usr._id !== id))
    toast.success('Member deactivated')
    setDeleteUser(null)
  }

  const handleCreate = async (data) => {
    const res = await usersAPI.create(data)
    setUsers((u) => [...u, res.data.user])
    toast.success(`${data.name} added to the workspace`)
  }

  if (loading) return <div className="flex justify-center py-20"><Spinner size="lg" /></div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Team</h1>
          <p className="text-slate-400 text-sm mt-0.5">{users.length} members</p>
        </div>
        {user.role === 'admin' && (
          <Button onClick={() => setShowCreate(true)}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="w-4 h-4">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add User
          </Button>
        )}
      </div>

      {/* Table */}
      <Card className="overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700/60">
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider px-6 py-4">Member</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-4">Role</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-4 hidden md:table-cell">Tasks</th>
              <th className="text-left text-xs text-slate-400 uppercase tracking-wider px-4 py-4 hidden lg:table-cell">Progress</th>
              <th className="px-4 py-4 hidden sm:table-cell" />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/40">
            {users.map((u) => {
              const s = stats[u._id] || {}
              const pct = s.total ? Math.round((s.done / s.total) * 100) : 0
              const isSelf = u._id === user._id

              return (
                <tr key={u._id} className={`hover:bg-slate-800/20 transition-colors ${isSelf ? 'bg-indigo-500/5' : ''}`}>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <Avatar user={u} />
                      <div>
                        <div className="text-sm font-medium text-white flex items-center gap-2">
                          {u.name}
                          {isSelf && <span className="text-xs text-indigo-400">(you)</span>}
                        </div>
                        <div className="text-xs text-slate-500">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <Badge className={roleConfig[u.role].badgeClass}>{roleConfig[u.role].label}</Badge>
                  </td>
                  <td className="px-4 py-4 hidden md:table-cell">
                    <div className="text-sm text-slate-300">{s.total || 0} total</div>
                    <div className="text-xs text-slate-500">{s.done || 0} done · {s.inProgress || 0} active</div>
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="text-xs text-slate-500">{pct}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 hidden sm:table-cell">
                    <div className="flex items-center gap-1 justify-end">
                      <button
                        onClick={() => setEditUser(u)}
                        className="text-slate-500 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>
                      {user.role === 'admin' && !isSelf && (
                        <button
                          onClick={() => setDeleteUser(u)}
                          className="text-slate-500 hover:text-red-400 p-1.5 rounded-lg hover:bg-slate-700 transition-colors"
                        >
                          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                            <polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14H6L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4h6v2" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>

      {editUser && (
        <EditUserModal user={editUser} onClose={() => setEditUser(null)} onSave={handleSave} currentUser={user} />
      )}
      {deleteUser && (
        <ConfirmDialog
          title="Deactivate Member"
          message={`Deactivate ${deleteUser.name}? They will lose access to the workspace.`}
          onConfirm={() => handleDelete(deleteUser._id)}
          onCancel={() => setDeleteUser(null)}
          danger
        />
      )}

      {showCreate && (
        <CreateUserModal
          onClose={() => setShowCreate(false)}
          onCreate={handleCreate}
        />
      )}
    </div>
  )
}
