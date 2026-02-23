import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { usersAPI } from '../../api/services'

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (_, { rejectWithValue }) => {
    try {
      const res = await usersAPI.getAll()
      return res.data.users
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || 'Failed to fetch users')
    }
  }
)

export const createUser = createAsyncThunk(
  'users/create',
  async (data, { rejectWithValue }) => {
    try {
      const res = await usersAPI.create(data)
      return res.data.user
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await usersAPI.update(id, data)
      return res.data.user
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      await usersAPI.delete(id)
      return id
    } catch (err) {
      return rejectWithValue(err.response?.data?.message)
    }
  }
)

const usersSlice = createSlice({
  name: 'users',
  initialState: {
    items: [],
    loading: false,
    error: null,
    lastFetched: null,
  },
  reducers: {
    invalidate(state) {
      state.lastFetched = null
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => { state.loading = true })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false
        state.items = action.payload
        state.lastFetched = Date.now()
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false
        state.error = action.payload
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.items.push(action.payload)
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        const idx = state.items.findIndex((u) => u._id === action.payload._id)
        if (idx !== -1) state.items[idx] = action.payload
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.items = state.items.filter((u) => u._id !== action.payload)
      })
  },
})

export const { invalidate: invalidateUsers } = usersSlice.actions

export const selectUsers = (state) => state.users.items
export const selectUsersLoading = (state) => state.users.loading
export const selectUsersLastFetched = (state) => state.users.lastFetched
export const USERS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes — users change rarely

export default usersSlice.reducer
