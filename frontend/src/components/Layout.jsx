import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import { useWS } from '../context/WSContext'

export default function Layout() {
  const { subscribe } = useWS()
  const [wsNotification, setWsNotification] = useState(null)

  useEffect(() => {
    return subscribe('layout-ws', (msg) => {
      const notifMap = {
        task_created: `⚡ ${msg.payload.user} created a task in ${msg.payload.projectName || 'a project'}`,
        task_updated: `↻ ${msg.payload.user} updated "${msg.payload.task?.title || 'a task'}"`,
        task_deleted: `✕ ${msg.payload.user} deleted "${msg.payload.taskTitle}"`,
        project_created: `◈ ${msg.payload.user} created project "${msg.payload.project?.name}"`,
      }
      const notif = notifMap[msg.type]
      if (notif) {
        setWsNotification(notif)
        setTimeout(() => setWsNotification(null), 5000)
      }
    })
  }, [subscribe])

  return (
    <div className="flex min-h-screen bg-slate-950">
      <Sidebar wsNotification={wsNotification} />
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-6 lg:px-8 py-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
