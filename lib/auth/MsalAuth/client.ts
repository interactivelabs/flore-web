import {
  createContext,
  useReducer,
  createElement,
  ReactElement,
  useContext,
  useEffect,
} from 'react';
import { MsalAuthProvider } from './MsalAuthProvider';
import {
  SessionContextValue,
  IMsalProviderInitOptions,
} from './interfaces/IMsalAuthClientTypes';
import { SessionAction, SESSION_ACTIONS } from './enums/AuthenticationActions';
import { AuthenticationProviderState } from './enums/AuthenticationProviderState';
import { AuthenticationState } from './enums/AuthenticationState';
import { IAccountInfo } from './interfaces/IAccountInfo';
import { AuthError } from 'msal';
import { AccessTokenResponse } from './AccessTokenResponse';
import { InitState } from './enums/InitState';

const initialState: AuthenticationProviderState = {
  isReady: false,
  authenticationState: AuthenticationState.Unauthenticated,
  loading: false,
  accountInfo: undefined,
  error: undefined,
  msalAuthProvider: undefined,
};

const SessionContext = createContext<Partial<SessionContextValue>>({
  session: initialState,
});

const sessionReducer = (
  session: AuthenticationProviderState,
  action: SessionAction,
): AuthenticationProviderState => {
  switch (action.type) {
    case SESSION_ACTIONS.INIT_MSAL_PROVIDER: {
      return {
        ...session,
        msalAuthProvider: action.payload,
      };
    }
    case SESSION_ACTIONS.INIT_STATE: {
      const initState: InitState = action.payload;
      return { ...session, isReady: initState === InitState.Completed };
    }
    case SESSION_ACTIONS.AUTH_STATE_CHANGE: {
      const authenticationState: AuthenticationState = action.payload;
      return {
        ...session,
        authenticationState,
        loading: authenticationState === AuthenticationState.InProgress,
      };
    }
    case SESSION_ACTIONS.ACCOUNT_INFO_CHANGE: {
      return { ...session, accountInfo: action.payload };
    }
    case SESSION_ACTIONS.ERROR: {
      return { ...session, error: action.payload };
    }
    default:
      return { ...session };
  }
};

export interface MsalProviderProps {
  children: ReactElement;
  options: IMsalProviderInitOptions;
}

// Provider to wrap the app in to make session data available globally
export const Provider = ({
  children,
  options,
}: MsalProviderProps): ReactElement => {
  const [session, dispatch] = useReducer(sessionReducer, initialState);
  const setAuthenticationState = (state: AuthenticationState) =>
    dispatch({ type: SESSION_ACTIONS.AUTH_STATE_CHANGE, payload: state });
  const setAcountInfo = (accountInfo?: IAccountInfo) =>
    dispatch({
      type: SESSION_ACTIONS.ACCOUNT_INFO_CHANGE,
      payload: accountInfo,
    });
  const setError = (error?: AuthError) =>
    dispatch({ type: SESSION_ACTIONS.ERROR, payload: error });
  const setIsReady = (state: InitState) =>
    dispatch({ type: SESSION_ACTIONS.INIT_STATE, payload: state });
  useEffect(() => {
    if (!session.msalAuthProvider) {
      const msalAuthProvider = new MsalAuthProvider(
        options.config,
        options.parameters,
        options.options,
      );
      msalAuthProvider.registerAcountInfoHandler(setAcountInfo);
      msalAuthProvider.registerAuthenticationStateHandler(
        setAuthenticationState,
      );
      msalAuthProvider.registerErrorHandler(setError);
      msalAuthProvider.registerInitInfoHandler(setIsReady);
      dispatch({
        type: SESSION_ACTIONS.INIT_MSAL_PROVIDER,
        payload: msalAuthProvider,
      });
    }
  }, [dispatch, options]);
  return createElement(
    SessionContext.Provider,
    { value: { session, dispatch } },
    children,
  );
};

export type UseSession = {
  signIn: () => void;
  signOut: () => void;
  getAccessToken: (scopes: Array<string>) => Promise<string>;
  isAuthenticated: boolean;
  loading: boolean;
  isReady: boolean;
};

// Internal hook for getting session from the api.
export const useSession = (): UseSession => {
  const { session } = useContext(SessionContext);
  const signIn = (): void => {
    session.msalAuthProvider.login();
  };
  const signOut = (): void => {
    session.msalAuthProvider.logout();
  };
  const isAuthenticated =
    session.authenticationState === AuthenticationState.Authenticated;
  const getAccessToken = async (scopes: Array<string>) => {
    const token: AccessTokenResponse = await session.msalAuthProvider.getAccessToken(
      { scopes },
    );
    return token.accessToken;
  };
  const loading = session.loading;
  const isReady = session.isReady;
  return {
    signIn,
    signOut,
    isAuthenticated,
    getAccessToken,
    loading,
    isReady,
  };
};
