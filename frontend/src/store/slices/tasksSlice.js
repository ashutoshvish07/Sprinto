import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { tasksAPI } from '../../api/services'

// ─── Thunks ───────────────────────────────────────────────────────────────────

export const fetchTasks = createAsyncThunk(
  'tasks/fetchAll',
  async (params = {}, { getState, rejectWithValue }) => {
    try {
      const res = await tasksAPI.getAll(params)
      return { tasks: res.data.tasks, params }
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch tasks')
    }
  }
)

export const fetchTaskStats = createAsyncThunk(
  'tasks/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      const res = await tasksAPI.getStats()
      return res.data.stats
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

export const createTask = createAsyncThunk(
  'tasks/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await tasksAPI.create(data)
      return res.data.task
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to create task')
    }
  }
)

export const updateTask = createAsyncThunk(
  'tasks/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await tasksAPI.update(id, data)
      return res.data.task
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to update task')
    }
  }
)

export const deleteTask = createAsyncThunk(
  'tasks/delete',
  async (id, { rejectWithValue }) => {
    try {
      await tasksAPI.delete(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to delete task')
    }
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],           // all tasks
    stats: null,         // task stats for dashboard
    loading: false,
    statsLoading: false,
    error: null,
    lastFetched: null,   // timestamp — used for cache check
    lastParams: null,    // params used in last fetch
  },
  reducers: {
    // Called by WebSocket to update task in real time
    wsTaskUpdated(state, action) {
      const updated = action.payload
      const idx = state.items.findIndex((t) => t._id === updated._id)
      if (idx !== -1) state.items[idx] = updated
    },
    wsTaskCreated(state, action) {
      const exists = state.items.find((t) => t._id === action.payload._id)
      if (!exists) state.items.unshift(action.payload)
    },
    wsTaskDeleted(state, action) {
      state.items = state.items.filter((t) => t._id !== action.payload)
    },
    // Force a refetch next time
    invalidate(state) {
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch tasks
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true
        state.error = null
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.tasks
        state.lastFetched = Date.now()
        state.lastParams = JSON.stringify(action.payload.params)
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })

      // Fetch stats
      .addCase(fetchTaskStats.pending, (state) => { state.statsLoading = true })
      .addCase(fetchTaskStats.fulfilled, (state, action) => {
        state.statsLoading = false
        state.stats = action.payload
      })
      .addCase(fetchTaskStats.rejected, (state) => { state.statsLoading = false })

      // Create task
      .addCase(createTask.fulfilled, (state, action) => {
        const exists = state.items.find((t) => t._id === action.payload._id)
        if (!exists) {
          state.items.unshift(action.payload)
          if (state.stats) state.stats.total = (state.stats.total || 0) + 1
        }
      })

      // Update task
      .addCase(updateTask.fulfilled, (state, action) => {
        const idx = state.items.findIndex((t) => t._id === action.payload._id)
        if (idx !== -1) state.items[idx] = action.payload
      })

      // Delete task
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload)
        if (state.stats) state.stats.total = Math.max(0, (state.stats.total || 1) - 1)
      })
  },
})

export const { wsTaskUpdated, wsTaskCreated, wsTaskDeleted, invalidate } = tasksSlice.actions

// ─── Selectors ────────────────────────────────────────────────────────────────
export const selectTasks = (state) => state.tasks.items
export const selectTaskStats = (state) => state.tasks.stats
export const selectTasksLoading = (state) => state.tasks.loading
export const selectTasksLastFetched = (state) => state.tasks.lastFetched
export const selectTasksLastParams = (state) => state.tasks.lastParams

// Cache duration: 60 seconds
export const CACHE_TTL = 60 * 1000

export default tasksSlice.reducer
