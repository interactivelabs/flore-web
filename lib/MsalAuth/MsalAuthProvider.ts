import {
  AuthenticationParameters,
  AuthError,
  AuthResponse,
  ClientAuthError,
  Configuration,
  InteractionRequiredAuthError,
  UserAgentApplication,
} from 'msal';

import { AccessTokenResponse } from './AccessTokenResponse';
import { IdTokenResponse } from './IdTokenResponse';
import { Logger } from './Logger';
import { IAccountInfo } from './interfaces/IAccountInfo';
import { IAuthProvider } from './interfaces/IAuthProvider';
import { IMsalAuthProviderConfig } from './interfaces/IMsalAuthProviderConfig';
import { AuthenticationState } from './enums/AuthenticationState';
import { LoginType } from './enums/LoginType';
import { TokenType } from './enums/TokenType';
import { InitState } from './enums/InitState';

export type AuthenticationStateHandler = (state: AuthenticationState) => void;
export type ErrorHandler = (error: AuthError | undefined) => void;
export type AccountInfoHandlers = (
  accountInfo: IAccountInfo | undefined,
) => void;
export type InitInfoHandler = (initState: InitState) => void;

export class MsalAuthProvider
  extends UserAgentApplication
  implements IAuthProvider {
  public authenticationState: AuthenticationState;

  /**
   * Gives access to the MSAL functionality for advanced usage.
   *
   * @deprecated The MsalAuthProvider class itself extends from UserAgentApplication and has the same functionality
   */
  public UserAgentApplication: UserAgentApplication;

  protected _parameters: AuthenticationParameters;
  protected _options: IMsalAuthProviderConfig;
  protected _accountInfo: IAccountInfo | undefined;
  protected _error: AuthError | undefined;

  private _onAuthenticationStateHandlers = new Set<
    AuthenticationStateHandler
  >();
  private _onAccountInfoHandlers = new Set<AccountInfoHandlers>();
  private _onErrorHandlers = new Set<ErrorHandler>();
  private _onInitInfoHandlers = new Set<InitInfoHandler>();

  constructor(
    config: Configuration,
    parameters: AuthenticationParameters,
    options: IMsalAuthProviderConfig = {
      loginType: LoginType.Popup,
      tokenRefreshUri: window.location.origin,
    },
  ) {
    super(config);

    // Required only for backward compatibility
    this.UserAgentApplication = this as UserAgentApplication;

    this.setAuthenticationParameters(parameters);
    this.setProviderOptions(options);

    this.initializeProvider();
  }

  public login = async (
    parameters?: AuthenticationParameters,
  ): Promise<void> => {
    const params = parameters || this.getAuthenticationParameters();

    // Clear any active authentication errors unless the code is executing from within
    // the token renewal iframe
    const error = this.getError();
    if (error && error.errorCode !== 'block_token_requests') {
      this.setError(undefined);
    }

    const providerOptions = this.getProviderOptions();
    if (providerOptions.loginType === LoginType.Redirect) {
      this.setAuthenticationState(AuthenticationState.InProgress);
      try {
        this.loginRedirect(params);
      } catch (error) {
        Logger.ERROR(error);

        this.setError(error);
        this.setAuthenticationState(AuthenticationState.Unauthenticated);
      }
    } else if (providerOptions.loginType === LoginType.Popup) {
      try {
        this.setAuthenticationState(AuthenticationState.InProgress);
        await this.loginPopup(params);
      } catch (error) {
        Logger.ERROR(error);

        this.setError(error);
        this.setAuthenticationState(AuthenticationState.Unauthenticated);
      }

      await this.processLogin();
    }
  };

  public getAccountInfo = (): IAccountInfo | undefined => {
    return this._accountInfo ? { ...this._accountInfo } : undefined;
  };

  public getAccessToken = async (
    parameters?: AuthenticationParameters,
  ): Promise<AccessTokenResponse> => {
    const providerOptions = this.getProviderOptions();

    // The parameters to be used when silently refreshing the token
    const refreshParams = {
      ...(parameters || this.getAuthenticationParameters()),
      // Use the redirectUri that was passed, otherwise use the configured tokenRefreshUri
      redirectUri:
        (parameters && parameters.redirectUri) ||
        providerOptions.tokenRefreshUri,
    };

    /* In this library, acquireTokenSilent is being called only when there is an accountInfo of an expired session.
     *  In a scenario where user interaction is required, username from the account info is passed as 'login_hint'
     *  parameter which redirects user to user's organization login page. So 'domain_hint' is not required to be
     *  passed for silent calls. Hence, the below code is to avoid sending domain_hint. This also solves the issue
     *  of multiple domain_hint param being added by the MSAL.js.
     */
    if (
      refreshParams.extraQueryParameters &&
      refreshParams.extraQueryParameters.domain_hint
    ) {
      delete refreshParams.extraQueryParameters.domain_hint;
    }

    try {
      const response = await this.acquireTokenSilent(refreshParams);

      this.handleAcquireTokenSuccess(response);
      this.setAuthenticationState(AuthenticationState.Authenticated);

      return new AccessTokenResponse(response);
    } catch (error) {
      // The parameters to be used if silent refresh failed, and a new login needs to be initiated
      const loginParams = {
        ...(parameters || this.getAuthenticationParameters()),
      };
      const response = await this.loginToRefreshToken(error, loginParams);

      return new AccessTokenResponse(response);
    }
  };

  public getIdToken = async (
    parameters?: AuthenticationParameters,
  ): Promise<IdTokenResponse> => {
    const providerOptions = this.getProviderOptions();
    const config = this.getCurrentConfiguration();
    const clientId = config.auth.clientId;

    // The parameters to be used when silently refreshing the token
    const refreshParams = {
      ...(parameters || this.getAuthenticationParameters()),
      // Use the redirectUri that was passed, otherwise use the configured tokenRefreshUri
      redirectUri:
        (parameters && parameters.redirectUri) ||
        providerOptions.tokenRefreshUri,
      // Pass the clientId as the only scope to get a renewed IdToken if it has expired
      scopes: [clientId],
    };

    /* In this library, acquireTokenSilent is being called only when there is an accountInfo of an expired session.
     *  In a scenario where user interaction is required, username from the account info is passed as 'login_hint'
     *  parameter which redirects user to user's organization login page. So 'domain_hint' is not required to be
     *  passed for silent calls. Hence, the below code is to avoid sending domain_hint. This also solves the issue
     *  of multiple domain_hint param being added by the MSAL.js.
     */
    if (
      refreshParams.extraQueryParameters &&
      refreshParams.extraQueryParameters.domain_hint
    ) {
      delete refreshParams.extraQueryParameters.domain_hint;
    }

    try {
      const response = await this.acquireTokenSilent(refreshParams);

      this.handleAcquireTokenSuccess(response);
      this.setAuthenticationState(AuthenticationState.Authenticated);

      return new IdTokenResponse(response);
    } catch (error) {
      // The parameters to be used if silent refresh failed, and a new login needs to be initiated
      const loginParams = {
        ...(parameters || this.getAuthenticationParameters()),
      };

      // If the parameters do not specify a login hint and the user already has a session cached,
      // prefer the cached user name to bypass the account selection process if possible
      const account = this.getAccount();
      if (account && (!parameters || !parameters.loginHint)) {
        loginParams.loginHint = account.userName;
      }
      const response = await this.loginToRefreshToken(error, loginParams);

      return new IdTokenResponse(response);
    }
  };

  public getAuthenticationParameters = (): AuthenticationParameters => {
    return { ...this._parameters };
  };

  public getError = (): AuthError | undefined =>
    this._error ? { ...this._error } : undefined;

  public setAuthenticationParameters = (
    parameters: AuthenticationParameters,
  ): void => {
    this._parameters = { ...parameters };
  };

  public getProviderOptions = (): IMsalAuthProviderConfig => ({
    ...this._options,
  });

  public setProviderOptions = (options: IMsalAuthProviderConfig): void => {
    this._options = { ...options };
    if (options.loginType === LoginType.Redirect) {
      this.handleRedirectCallback(this.authenticationRedirectCallback);
    }
  };

  public registerAuthenticationStateHandler = (
    listener: AuthenticationStateHandler,
  ): void => {
    this._onAuthenticationStateHandlers.add(listener);
    listener(this.authenticationState);
  };

  public unregisterAuthenticationStateHandler = (
    listener: AuthenticationStateHandler,
  ): void => {
    this._onAuthenticationStateHandlers.delete(listener);
  };

  public registerAcountInfoHandler = (listener: AccountInfoHandlers): void => {
    this._onAccountInfoHandlers.add(listener);
    listener(this._accountInfo);
  };

  public unregisterAccountInfoHandler = (
    listener: AccountInfoHandlers,
  ): void => {
    this._onAccountInfoHandlers.delete(listener);
  };

  public registerErrorHandler = (listener: ErrorHandler): void => {
    this._onErrorHandlers.add(listener);
    listener(this._error);
  };

  public unregisterErrorHandler = (listener: ErrorHandler): void => {
    this._onErrorHandlers.delete(listener);
  };

  public registerInitInfoHandler = (listener: InitInfoHandler): void => {
    this._onInitInfoHandlers.add(listener);
  };

  public unregisterInitInfoHandler = (listener: InitInfoHandler): void => {
    this._onInitInfoHandlers.delete(listener);
  };

  private setError = (error: AuthError | undefined) => {
    this._error = error ? { ...error } : undefined;
    this._onErrorHandlers.forEach((listener) => listener(this._error));
    return { ...this._error };
  };

  private loginToRefreshToken = async (
    error: AuthError,
    parameters?: AuthenticationParameters,
  ): Promise<AuthResponse> => {
    const providerOptions = this.getProviderOptions();
    const params = parameters || this.getAuthenticationParameters();

    if (error instanceof InteractionRequiredAuthError) {
      if (providerOptions.loginType === LoginType.Redirect) {
        this.acquireTokenRedirect(params);

        // Nothing to return, the user is redirected to the login page
        return new Promise<AuthResponse>((resolve) => resolve());
      }

      try {
        const response = await this.acquireTokenPopup(params);
        this.handleAcquireTokenSuccess(response);
        this.setAuthenticationState(AuthenticationState.Authenticated);
        return response;
      } catch (error) {
        Logger.ERROR(error);

        this.setError(error);
        this.setAuthenticationState(AuthenticationState.Unauthenticated);

        throw error;
      }
    } else {
      Logger.ERROR(error as any);

      this.setError(error);
      this.setAuthenticationState(AuthenticationState.Unauthenticated);

      throw error;
    }
  };

  private authenticationRedirectCallback = (error: AuthError) => {
    if (error) {
      this.setError(error);
    }
    this.processLogin();
  };

  private initializeProvider = async () => {
    this.setInitState(InitState.InProgress);
    await this.processLogin();
    this.setInitState(InitState.Completed);
  };

  private processLogin = async () => {
    if (this.getError()) {
      this.setAuthenticationState(AuthenticationState.Unauthenticated);
    } else if (this.getAccount()) {
      try {
        // If the IdToken has expired, refresh it. Otherwise use the cached token
        await this.getIdToken();
      } catch (error) {
        // Swallow the error if the user isn't authenticated, just set to Unauthenticated
        if (
          !(
            error instanceof ClientAuthError &&
            error.errorCode === 'user_login_error'
          )
        ) {
          Logger.ERROR(error);
          this.setError(error);
        }

        this.setAuthenticationState(AuthenticationState.Unauthenticated);
      }
    } else if (this.getLoginInProgress()) {
      this.setAuthenticationState(AuthenticationState.InProgress);
    } else {
      this.setAuthenticationState(AuthenticationState.Unauthenticated);
    }
  };

  private setAuthenticationState = (
    state: AuthenticationState,
  ): AuthenticationState => {
    if (this.authenticationState !== state) {
      this.authenticationState = state;
      this._onAuthenticationStateHandlers.forEach((listener) =>
        listener(state),
      );
    }

    return this.authenticationState;
  };

  private setInitState = (state: InitState) => {
    this._onInitInfoHandlers.forEach((listener) => listener(state));
  };

  private setAccountInfo = (response: AuthResponse): IAccountInfo => {
    const accountInfo: IAccountInfo =
      this.getAccountInfo() || ({ account: response.account } as IAccountInfo);

    // Depending on the token type of the auth response, update the correct property
    if (response.tokenType === TokenType.IdToken) {
      accountInfo.jwtIdToken = response.idToken.rawIdToken;
    } else if (response.tokenType === TokenType.AccessToken) {
      accountInfo.jwtAccessToken = response.accessToken;
    }

    this._accountInfo = { ...accountInfo };
    this._onAccountInfoHandlers.forEach((listener) =>
      listener(this._accountInfo),
    );

    return { ...this._accountInfo };
  };

  private handleAcquireTokenSuccess = (response: AuthResponse): void => {
    this.setAccountInfo(response);
  };
}
