import { Configuration, AuthenticationParameters } from 'msal';
import { IMsalAuthProviderConfig } from './IMsalAuthProviderConfig';
import { Dispatch } from 'react';
import { AuthenticationProviderState } from '../enums/AuthenticationProviderState';
import { SessionAction } from '../enums/AuthenticationActions';

export interface IMsalProviderInitOptions {
  config: Configuration;
  parameters: AuthenticationParameters;
  options: IMsalAuthProviderConfig;
}

export interface SessionContextValue {
  session: AuthenticationProviderState;
  dispatch: Dispatch<SessionAction>;
}
