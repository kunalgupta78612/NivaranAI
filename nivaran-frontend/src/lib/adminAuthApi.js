import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  getAdminDashboardStats,
  getAdminDepartments,
  getAdminCitizens,
  getAdminAllGrievances,
  approveDepartment,
  rejectDepartment,
} from '../api/index'

export {
  loginAdmin,
  logoutAdmin,
  getCurrentAdmin,
  getAdminDashboardStats,
  getAdminDepartments,
  getAdminCitizens,
  getAdminAllGrievances,
  approveDepartment,
  rejectDepartment,
}

// ========================
// TanStack Query Admin Hooks
// ========================

export function useCurrentAdmin() {
  return useQuery({
    queryKey: ['currentAdmin'],
    queryFn: getCurrentAdmin,
    retry: false,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  })
}

export function useAdminLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginAdmin,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentAdmin'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminCitizens'] })
      queryClient.invalidateQueries({ queryKey: ['adminAllGrievances'] })
    },
  })
}

export function useAdminLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutAdmin,
    onSuccess: () => {
      queryClient.setQueryData(['currentAdmin'], null)
      queryClient.invalidateQueries({ queryKey: ['currentAdmin'] })
    },
  })
}

export function useAdminStats() {
  return useQuery({
    queryKey: ['adminStats'],
    queryFn: getAdminDashboardStats,
    retry: 1,
    staleTime: 0,
  })
}

export function useAdminDepartments() {
  return useQuery({
    queryKey: ['adminDepartments'],
    queryFn: getAdminDepartments,
    retry: 1,
    staleTime: 0,
  })
}

export function useAdminCitizens() {
  return useQuery({
    queryKey: ['adminCitizens'],
    queryFn: getAdminCitizens,
    retry: 1,
    staleTime: 0,
  })
}

export function useAdminAllGrievances() {
  return useQuery({
    queryKey: ['adminAllGrievances'],
    queryFn: getAdminAllGrievances,
    retry: 1,
    staleTime: 0,
  })
}

export function useApproveDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => approveDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      queryClient.invalidateQueries({ queryKey: ['currentDepartment'] })
    },
  })
}

export function useRejectDepartment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => rejectDepartment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      queryClient.invalidateQueries({ queryKey: ['currentDepartment'] })
    },
  })
}
