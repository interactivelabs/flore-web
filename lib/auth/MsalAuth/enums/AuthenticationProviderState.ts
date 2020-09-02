import { MsalAuthProvider } from '../MsalAuthProvider';
import { AuthenticationState } from './AuthenticationState';
import { IAccountInfo } from '../interfaces/IAccountInfo';
import { AuthError } from 'msal';

export interface AuthenticationProviderState {
  isReady: boolean;
  authenticationState: AuthenticationState;
  loading: boolean;
  accountInfo?: IAccountInfo;
  error?: AuthError;
  msalAuthProvider?: MsalAuthProvider;
}
