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
    refetchInterval: 3 * 1000, // Fast 3-second live polling for real-time notifications
    staleTime: 1 * 1000,
    refetchOnWindowFocus: true,
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
