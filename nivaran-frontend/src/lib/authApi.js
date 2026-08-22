import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  registerUser,
  loginUser,
  logoutUser,
  getCurrentCitizen,
  updateCitizenProfile,
} from '../api/index'

export { registerUser, loginUser, logoutUser, getCurrentCitizen, updateCitizenProfile }

// ========================
// TanStack Query Hooks
// ========================

export function useCurrentCitizen() {
  return useQuery({
    queryKey: ['currentCitizen'],
    queryFn: getCurrentCitizen,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registerUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutUser,
    onSuccess: () => {
      queryClient.setQueryData(['currentCitizen'], null)
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateCitizenProfile,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentCitizen'] })
    },
  })
}


