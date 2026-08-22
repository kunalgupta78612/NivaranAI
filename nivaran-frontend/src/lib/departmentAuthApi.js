import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  registerDepartment,
  loginDepartment,
  logoutDepartment,
  getDepartmentMe,
  getDepartmentGrievances,
  updateGrievanceStatusDept,
  changeDepartmentPassword,
} from '../api/departmentApi'

// ========================
// Department Auth Hooks
// ========================

export function useCurrentDepartment() {
  return useQuery({
    queryKey: ['currentDepartment'],
    queryFn: getDepartmentMe,
    retry: false,
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}

export function useDepartmentRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: registerDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentDepartment'] })
      queryClient.invalidateQueries({ queryKey: ['adminDepartments'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
    },
  })
}

export function useDepartmentLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: loginDepartment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currentDepartment'] })
      queryClient.invalidateQueries({ queryKey: ['departmentGrievances'] })
    },
  })
}

export function useDepartmentLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: logoutDepartment,
    onSuccess: () => {
      queryClient.setQueryData(['currentDepartment'], null)
      queryClient.removeQueries({ queryKey: ['departmentGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['currentDepartment'] })
    },
  })
}

// ========================
// Department Grievance Hooks
// ========================

export function useDepartmentGrievances() {
  return useQuery({
    queryKey: ['departmentGrievances'],
    queryFn: getDepartmentGrievances,
    staleTime: 0,
    refetchOnWindowFocus: true,
  })
}

export function useUpdateGrievanceStatusDept() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: updateGrievanceStatusDept,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departmentGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['myGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceCount'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminAllGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
    },
  })
}

export function useDepartmentChangePassword() {
  return useMutation({
    mutationFn: changeDepartmentPassword,
  })
}
