import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from '../api/notificationApi'

export {
  getMyNotifications,
  markNotificationRead,
  markAllNotificationsRead,
}

// ============================================================================
// TanStack Query Hook: Auto-fetches user notifications every 1 minute (60s)
// ============================================================================
export function useNotifications() {
  return useQuery({
    queryKey: ['notifications'],
    queryFn: getMyNotifications,
    refetchInterval: 5 * 1000, // 1-minute auto-polling as required
    staleTime: 30 * 1000,
    retry: false,
  })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id) => markNotificationRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
    },
  })
}
