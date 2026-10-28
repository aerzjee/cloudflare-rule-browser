import { QueryClient } from '@tanstack/react-query'

/**
 * Shared QueryClient instance used by React QueryProvider and state stores.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
})

export default queryClient
