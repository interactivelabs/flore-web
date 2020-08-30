import { createContext } from 'react'

// Context to store session data globally
const SessionContext = createContext()

// Universal method (client + server)
const getSession = async ({ req, ctx, triggerEvent = true } = {}) => {
  // If passed 'appContext' via getInitialProps() in _app.js then get the req
  // object from ctx and use that for the req value to allow getSession() to
  // work seemlessly in getInitialProps() on server side pages *and* in _app.js.
  if (!req && ctx && ctx.req) {
    req = ctx.req
  }

  const baseUrl = _apiBaseUrl()
  const fetchOptions = req ? { headers: { cookie: req.headers.cookie } } : {}
  const session = await _fetchData(`${baseUrl}/session`, fetchOptions)
  if (triggerEvent) {
    _sendMessage({ event: 'session', data: { trigger: 'getSession' } })
  }
  return session
}

// Client side method
const useSession = (session) => {
  // Try to use context if we can
  const value = useContext(SessionContext)

  // If we have no Provider in the tree, call the actual hook
  if (value === undefined) {
    return _useSessionHook(session)
  }

  return value
}

// Internal hook for getting session from the api.
const _useSessionHook = (session) => {
  const [data, setData] = useState(session)
  const [loading, setLoading] = useState(true)
  const _getSession = async ({ event = null } = {}) => {
    try {
      const triggredByEvent = event !== null
      const triggeredByStorageEvent = !!(event && event === 'storage')

      const clientMaxAge = __NEXTAUTH.clientMaxAge
      const clientLastSync = parseInt(__NEXTAUTH._clientLastSync)
      const currentTime = Math.floor(new Date().getTime() / 1000)
      const clientSession = __NEXTAUTH._clientSession

      // Updates triggered by a storage event *always* trigger an update and we
      // always update if we don't have any value for the current session state.
      if (triggeredByStorageEvent === false && clientSession !== undefined) {
        if (clientMaxAge === 0 && triggredByEvent !== true) {
          // If there is no time defined for when a session should be considered
          // stale, then it's okay to use the value we have until an event is
          // triggered which updates it.
          return
        } else if (clientMaxAge > 0 && clientSession === null) {
          // If the client doesn't have a session then we don't need to call
          // the server to check if it does (if they have signed in via another
          // tab or window that will come through as a triggeredByStorageEvent
          // event and will skip this logic)
          return
        } else if (
          clientMaxAge > 0 &&
          currentTime < clientLastSync + clientMaxAge
        ) {
          // If the session freshness is within clientMaxAge then don't request
          // it again on this call (avoids too many invokations).
          return
        }
      }

      if (clientSession === undefined) {
        __NEXTAUTH._clientSession = null
      }

      // Update clientLastSync before making response to avoid repeated
      // invokations that would otherwise be triggered while we are still
      // waiting for a response.
      __NEXTAUTH._clientLastSync = Math.floor(new Date().getTime() / 1000)

      // If this call was invoked via a storage event (i.e. another window) then
      // tell getSession not to trigger an event when it calls to avoid an
      // infinate loop.
      const triggerEvent = triggeredByStorageEvent === false
      const newClientSessionData = await getSession({ triggerEvent })

      // Save session state internally, just so we can track that we've checked
      // if a session exists at least once.
      __NEXTAUTH._clientSession = newClientSessionData

      setData(newClientSessionData)
      setLoading(false)
    } catch (error) {
      logger.error('CLIENT_USE_SESSION_ERROR', error)
    }
  }

  __NEXTAUTH._getSession = _getSession

  useEffect(() => {
    _getSession()
  })
  return [data, loading]
}

// Provider to wrap the app in to make session data available globally
const Provider = ({ children, session, options }) => {
  setOptions(options)
  return createElement(
    SessionContext.Provider,
    { value: useSession(session) },
    children
  )
}

export default {
  getSession,
  useSession,
  signIn,
  signOut,
  Provider,
}
