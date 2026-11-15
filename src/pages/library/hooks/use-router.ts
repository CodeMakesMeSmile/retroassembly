import { useNavigation } from 'react-router'

export function useRouter() {
  const { state } = useNavigation()

  const isNavigating = state === 'loading'

  return { isNavigating }
}
