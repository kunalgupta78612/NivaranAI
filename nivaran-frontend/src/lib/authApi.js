import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axiosInstance from './axios'

// ========================
// Auth API functions
// ========================

/** POST /api/auth/register */
const registerCitizen = async (data) => {
  const res = await axiosInstance.post('/auth/register', data)
  return res.data
}

/** POST /api/auth/login */
const loginCitizen = async (data) => {
  const res = await axiosInstance.post('/auth/login', data)
  return res.data
}

/** POST /api/auth/logout */
const logoutCitizen = async () => {
  const res = await axiosInstance.post('/auth/logout')
  return res.data
}

/** GET /api/auth/me */
const fetchCurrentCitizen = async () => {
  const res = await axiosInstance.get('/auth/me')
  return res.data
}

/** PUT /api/auth/profile */
const updateCitizenProfile = async (data) => {
  const res = await axiosInstance.put('/auth/profile', data)
  return res.data
}

// ========================
// TanStack Query Hooks
// ========================

/**
 * Fetch current authenticated citizen.
 * Returns { data, isLoading, isError, error, refetch }
 * - On 401 (not logged in), returns null without throwing.
 */
export function useCurrentCitizen() {
  return useQuery({
    queryKey: ['currentCitizen'],
    queryFn: fetchCurrentCitizen,
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 min
    refetchOnWindowFocus: true,
  })
}

/**
 * Register mutation.
 * On success, invalidates currentCitizen query.
 */
export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registerCitizen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}

/**
 * Login mutation.
 * On success, invalidates currentCitizen query so /me is refetched.
 */
export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginCitizen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}

/**
 * Logout mutation.
 * On success, clears currentCitizen from cache.
 */
export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutCitizen,
    onSuccess: () => {
      queryClient.setQueryData(['currentCitizen'], null)
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}

/** PUT /api/auth/change-password */
const changePasswordCitizen = async (data) => {
  const res = await axiosInstance.put('/auth/change-password', data)
  return res.data
}

/**
 * Profile update mutation.
 * On success, refetches currentCitizen.
 */
export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCitizenProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}

/**
 * Password change mutation.
 */
export function useChangePassword() {
  return useMutation({
    mutationFn: changePasswordCitizen,
  })
}
