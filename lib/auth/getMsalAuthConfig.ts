import { Configuration, AuthenticationParameters } from 'msal';
import { IMsalAuthProviderConfig } from './MsalAuth/interfaces/IMsalAuthProviderConfig';
import { LoginType } from './MsalAuth/enums/LoginType';
import { IMsalProviderInitOptions } from './MsalAuth/interfaces/IMsalAuthClientTypes';

const tenant = 'interactivelabsad.onmicrosoft.com';
const signUpSignInPolicyId = 'b2c_1_flore-signup';
const clientId = '20812464-e130-478f-82b5-91a103589397';
const redirectUri = 'http://localhost:3000/api/auth/callback';
const tenantSubdomain = tenant.split('.')[0];
const instance = `https://${tenantSubdomain}.b2clogin.com/`;
const authority = `${instance}${tenant}/${signUpSignInPolicyId}`;

// Msal Configurations
export const config: Configuration = {
  auth: {
    authority,
    clientId,
    redirectUri,
    validateAuthority: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: true,
  },
};

// Authentication Parameters
export const parameters: AuthenticationParameters = {
  scopes: [
    'openid',
    'offline_access',
    'profile',
    'email',
    'https://interactivelabsad.onmicrosoft.com/api/demo.write',
    'https://interactivelabsad.onmicrosoft.com/api/demo.read',
  ],
};

// Options
export const options: IMsalAuthProviderConfig = {
  loginType: LoginType.Popup,
  tokenRefreshUri: redirectUri,
};

export const getMsalAuthConfig = (): IMsalProviderInitOptions => ({
  config,
  parameters,
  options,
});
