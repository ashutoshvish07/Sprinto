import { configureStore } from '@reduxjs/toolkit'
import tasksReducer from './slices/tasksSlice'
import projectsReducer from './slices/projectsSlice'
import usersReducer from './slices/usersSlice'
import logsReducer from './slices/logsSlice'

export const store = configureStore({
  reducer: {
    tasks: tasksReducer,
    projects: projectsReducer,
    users: usersReducer,
    logs: logsReducer,
  },
})

export default store
