import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { logsAPI } from '../../api/services'

export const fetchLogs = createAsyncThunk(
  'logs/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const res = await logsAPI.getAll(params)
      return res.data
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

const logsSlice = createSlice({
  name: 'logs',
  initialState: {
    items: [],
    total: 0,
    loading: false,
    lastFetched: null,
  },
  reducers: {
    invalidate(state) {
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchLogs.pending, (state) => { state.loading = true })
      .addCase(fetchLogs.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload.logs
        state.total = action.payload.total || action.payload.logs.length
        state.lastFetched = Date.now()
      })
      .addCase(fetchLogs.rejected, (state) => { state.loading = false })
  },
})

export const { invalidate: invalidateLogs } = logsSlice.actions

export const selectLogs = (state) => state.logs.items
export const selectLogsTotal = (state) => state.logs.total
export const selectLogsLoading = (state) => state.logs.loading
export const selectLogsLastFetched = (state) => state.logs.lastFetched
export const LOGS_CACHE_TTL = 30 * 1000 // 30 seconds

export default logsSlice.reducer
