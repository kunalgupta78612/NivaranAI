import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createGrievance,
  getMyGrievances,
  getGrievanceById,
  getGrievanceTracking,
  getGrievanceAudit,
  getMyGrievanceCount,
  updateGrievance,
  deleteGrievance,
  getCitizenDashboardStats,
} from '../api/index'

export {
  createGrievance,
  getMyGrievances,
  getGrievanceById,
  getGrievanceTracking,
  getGrievanceAudit,
  getMyGrievanceCount,
  updateGrievance,
  deleteGrievance,
  getCitizenDashboardStats,
}

// ========================
// TanStack Query Hooks
// ========================

export function useMyGrievances() {
  return useQuery({
    queryKey: ['myGrievances'],
    queryFn: getMyGrievances,
    retry: 1,
    staleTime: 0,
  })
}

export function useGrievanceTracking(id) {
  return useQuery({
    queryKey: ['grievanceTracking', id],
    queryFn: () => getGrievanceTracking(id),
    enabled: Boolean(id),
    retry: 1,
    staleTime: 0,
  })
}

export function useGrievanceAudit(id) {
  return useQuery({
    queryKey: ['grievanceAudit', id],
    queryFn: () => getGrievanceAudit(id),
    enabled: Boolean(id),
    retry: 1,
    staleTime: 0,
  })
}

export function useGrievanceStats() {
  return useQuery({
    queryKey: ['grievanceStats'],
    queryFn: getCitizenDashboardStats,
    retry: 1,
    staleTime: 0,
  })
}

export function useGrievanceCount() {
  return useQuery({
    queryKey: ['grievanceCount'],
    queryFn: getMyGrievanceCount,
    retry: 1,
    staleTime: 0,
  })
}

export function useSubmitGrievance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: createGrievance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceCount'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminAllGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['departmentGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceTracking'] })
    },
  })
}

export function useUpdateGrievanceStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...data }) => updateGrievance(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceCount'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminAllGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['departmentGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceTracking'] })
    },
  })
}

export function useDeleteGrievance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: deleteGrievance,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceCount'] })
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminStats'] })
      queryClient.invalidateQueries({ queryKey: ['adminAllGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['departmentGrievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievances'] })
      queryClient.invalidateQueries({ queryKey: ['grievanceTracking'] })
    },
  })
}
