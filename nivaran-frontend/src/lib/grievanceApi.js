import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  createGrievance,
  getMyGrievances,
  getGrievanceById,
  getMyGrievanceCount,
  updateGrievance,
  deleteGrievance,
  getCitizenDashboardStats,
} from '../api/index'

export {
  createGrievance,
  getMyGrievances,
  getGrievanceById,
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
    },
  })
}
