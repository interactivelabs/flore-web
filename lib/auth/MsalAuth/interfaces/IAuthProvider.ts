import { AuthenticationState } from '../enums/AuthenticationState';
import { IAccountInfo } from './IAccountInfo';

export interface IAuthProvider {
  onAuthenticationStateChanged?: (
    state: AuthenticationState,
    account?: IAccountInfo,
  ) => void;
  authenticationState: AuthenticationState;

  getAccountInfo(): IAccountInfo | undefined;
  login(): void;
  logout(): void;
}
