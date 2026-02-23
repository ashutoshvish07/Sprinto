import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { projectsAPI } from '../../api/services'

export const fetchProjects = createAsyncThunk(
  'projects/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await projectsAPI.getAll()
      return res.data.projects
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch projects')
    }
  }
)

export const createProject = createAsyncThunk(
  'projects/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await projectsAPI.create(data)
      return res.data.project
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

export const updateProject = createAsyncThunk(
  'projects/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await projectsAPI.update(id, data)
      return res.data.project
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

export const deleteProject = createAsyncThunk(
  'projects/delete',
  async (id, { rejectWithValue }) => {
    try {
      await projectsAPI.delete(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

const projectsSlice = createSlice({
  name: 'projects',
  initialState: {
    items: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  reducers: {
    wsProjectCreated(state, action) {
      const exists = state.items.find((p) => p._id === action.payload._id)
      if (!exists) state.items.push(action.payload)
    },
    wsProjectUpdated(state, action) {
      const idx = state.items.findIndex((p) => p._id === action.payload._id)
      if (idx !== -1) state.items[idx] = action.payload
    },
    wsProjectDeleted(state, action) {
      state.items = state.items.filter((p) => p._id !== action.payload)
    },
    invalidate(state) {
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchProjects.pending, (state) => { state.loading = true })
      .addCase(fetchProjects.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
        state.lastFetched = Date.now()
      })
      .addCase(fetchProjects.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createProject.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(updateProject.fulfilled, (state, action) => {
        const idx = state.items.findIndex((p) => p._id === action.payload._id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(deleteProject.fulfilled, (state, action) => {
        state.items = state.items.filter((p) => p._id !== action.payload)
      })
  },
})

export const { wsProjectCreated, wsProjectUpdated, wsProjectDeleted, invalidate: invalidateProjects } = projectsSlice.actions

export const selectProjects = (state) => state.projects.items
export const selectProjectsLoading = (state) => state.projects.loading
export const selectProjectsLastFetched = (state) => state.projects.lastFetched
export const PROJECTS_CACHE_TTL = 60 * 1000

export default projectsSlice.reducer
