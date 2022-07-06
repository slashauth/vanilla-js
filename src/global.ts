import { ICache } from './cache';
import { verify as verifyIdToken } from './jwt';

export interface GetNonceToSignEndpointOptions {
  baseUrl: string;
  address: string;
  client_id: string;
  device_id: string;
}

export interface LoginWithSignedNonceOptions
  extends GetNonceToSignEndpointOptions {
  signature: string;
}

export interface LoginWithSignedNonceResponse {
  access_token: string;
  refresh_token: string;
  client_id: string;
  scopes: string[];
  expires_in: number;
}

export interface GetNonceToSignResponse {
  nonce: string;
}

export interface RefreshTokenOptions {
  baseUrl: string;
  audience?: string;
  device_id: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

export type HasRoleOptions = {
  baseUrl: string;
  clientID: string;
  roleName: string;
  accessToken: string;
};

export type HasRoleResponse = {
  hasRole: boolean;
};

export interface IdToken {
  __raw: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  middle_name?: string;
  nickname?: string;
  preferred_username?: string;
  profile?: string;
  picture?: string;
  website?: string;
  email?: string;
  email_verified?: boolean;
  gender?: string;
  birthdate?: string;
  zoneinfo?: string;
  locale?: string;
  phone_number?: string;
  phone_number_verified?: boolean;
  address?: string;
  updated_at?: string;
  iss?: string;
  aud?: string;
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
  azp?: string;
  nonce?: string;
  auth_time?: string;
  at_hash?: string;
  c_hash?: string;
  acr?: string;
  amr?: string;
  sub_jwk?: string;
  cnf?: string;
  sid?: string;
  org_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export enum Network {
  Unknown,
  Ethereum,
}

export interface GetAccountOptions {
  /**
   * The scope that was used in the authentication request
   */
  scope?: string;
  /**
   * The audience that was used in the authentication request
   */
  audience?: string;
}

export interface GetIdTokenClaimsOptions {
  /**
   * The scope that was used in the authentication request
   */
  scope?: string;
  /**
   * The audience that was used in the authentication request
   */
  audience?: string;
}

export interface GetTokenSilentlyOptions {
  /**
   * When `true`, ignores the cache and always sends a
   * request to slashauth.
   */
  ignoreCache?: boolean;

  /** A maximum number of seconds to wait before declaring the background /authorize call as failed for timeout
   * Defaults to 60s.
   */
  timeoutInSeconds?: number;

  /**
   * If true, the full response from the /oauth/token endpoint (or the cache, if the cache was used) is returned
   * (minus `refresh_token` if one was issued). Otherwise, just the access token is returned.
   *
   * The default is `false`.
   */
  detailedResponse?: boolean;

  /**
   * If you need to send custom parameters to the Authorization Server,
   * make sure to use the original parameter name.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export class Account {
  network: Network;
  address: string;
  updatedAt?: string;
}

export interface RefreshTokenResponse {
  access_token: string;
  expires_in: number;
}

export interface TokenEndpointOptions {
  baseUrl: string;
  clientID: string;
  grant_type: string;
  timeout?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  slashAuthClient: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface RefreshTokenOptions {
  baseUrl: string;
  audience?: string;
  device_id: string;
}

export type TokenEndpointResponse = {
  id_token?: string;
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  client_id?: string;
};

export type GetTokenSilentlyResult = TokenEndpointResponse & {
  decodedToken: ReturnType<typeof verifyIdToken>;
  scope: string;
  audience: string;
};

export type GetTokenSilentlyVerboseResponse = Omit<
  TokenEndpointResponse,
  'refresh_token'
>;

export interface LogoutOptions {
  /**
   * The URL where SlashAuth will redirect your browser to after the logout.
   *
   * **Note**: If the `client_id` parameter is included, the
   * `returnTo` URL that is provided must be listed in the
   * Application's "Allowed Logout URLs" in the SlashAuth dashboard.
   * However, if the `client_id` parameter is not included, the
   * `returnTo` URL must be listed in the "Allowed Logout URLs" at
   * the account level in the SlashAuth dashboard.
   */
  // returnTo?: string;

  /**
   * The `client_id` of your application.
   *
   * If this property is not set, then the `client_id` that was used during initialization of the SDK is sent to the logout endpoint.
   *
   * If this property is set to `null`, then no client ID value is sent to the logout endpoint.
   */
  // client_id?: string;

  /**
   * When `true`, this skips the request to the logout endpoint on the authorization server,
   * effectively performing a "local" logout of the application. No redirect should take place,
   * you should update local logged in state.
   */
  localOnly?: boolean;
}

export interface LogoutUrlOptions {
  /**
   * The URL where SlashAuth will redirect your browser to after the logout.
   */
  returnTo?: string;

  /**
   * The `client_id` of your application.
   *
   * If this property is not set, then the `client_id` that was used during initialization of the SDK is sent to the logout endpoint.
   *
   * If this property is set to `null`, then no client ID value is sent to the logout endpoint.
   *
   */
  client_id?: string;

  device_id?: string;

  access_token?: string;
}

export interface JWTVerifyOptions {
  iss: string;
  aud: string;
  id_token: string;
  nonce?: string;
  leeway?: number;
  max_age?: number;
  organizationId?: string;
  now?: number;
}

export type CacheLocation = 'memory' | 'localstorage';

export interface BaseLoginOptions {
  cacheLocation?: CacheLocation;

  issuer?: string;

  leeway?: number;

  max_age?: number;

  cache?: ICache;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

export interface GetNonceToSignOptions extends BaseLoginOptions {
  address: string;
}

export interface LoginNoRedirectNoPopupOptions extends BaseLoginOptions {
  address: string;

  signature: string;
}

export enum LoginStep {
  Uninitialized,
  Connected,
  ReadyToLogin,
  LoggedIn,
}
