import { MsalAuthProvider } from '../MsalAuthProvider';
import { AuthenticationState } from './AuthenticationState';
import { IAccountInfo } from '../interfaces/IAccountInfo';
import { AuthError } from 'msal';
import { InitState } from './InitState';

export enum SESSION_ACTIONS {
  INIT_MSAL_PROVIDER = 'INIT_MSAL_PROVIDER',
  AUTH_STATE_CHANGE = 'AUTH_STATE_CHANGE',
  ACCOUNT_INFO_CHANGE = 'ACCOUNT_INFO_CHANGE',
  ERROR = 'ERROR',
  INIT_STATE = 'INIT_STATE',
}

export type SessionAction =
  | { type: SESSION_ACTIONS.INIT_MSAL_PROVIDER; payload: MsalAuthProvider }
  | { type: SESSION_ACTIONS.AUTH_STATE_CHANGE; payload: AuthenticationState }
  | { type: SESSION_ACTIONS.ACCOUNT_INFO_CHANGE; payload: IAccountInfo }
  | { type: SESSION_ACTIONS.ERROR; payload: AuthError | undefined }
  | { type: SESSION_ACTIONS.INIT_STATE; payload: InitState };
