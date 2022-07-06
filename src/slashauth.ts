import Lock from 'browser-tabs-lock';
import {
  refreshToken,
  logout as apiLogout,
  getNonceToSign,
  loginWithSignedNonce,
  hasRoleAPICall,
} from './api';
import { CacheKey, CacheManager, LocalStorageCache } from './cache';
import { CacheKeyManifest } from './cache/key-manifest';
import { DEFAULT_NOW_PROVIDER, DEFAULT_SLASHAUTH_CLIENT } from './constants';
import browserDeviceID from './device';
import { NotLoggedInError, TimeoutError } from './errors';
import {
  Account,
  GetAccountOptions,
  GetIdTokenClaimsOptions,
  GetNonceToSignOptions,
  GetTokenSilentlyOptions,
  GetTokenSilentlyResult,
  GetTokenSilentlyVerboseResponse,
  IdToken,
  LoginNoRedirectNoPopupOptions,
  LogoutOptions,
  LogoutUrlOptions,
  RefreshTokenOptions,
} from './global';
import { retryPromise, singlePromise } from './promise';
import { createQueryParams } from './utils';
import { verify as verifyIdToken } from './jwt';

const lock = new Lock();

const GET_TOKEN_SILENTLY_LOCK_KEY = 'slashauth.lock.getTokenSilently';

const getDomain = (domainUrl: string) => {
  if (!/^https?:\/\//.test(domainUrl)) {
    return `https://${domainUrl}`;
  }

  return domainUrl;
};

const getTokenIssuer = (issuer: string, domainUrl: string) => {
  if (issuer) {
    return issuer.startsWith('https://') ? issuer : `https://${issuer}/`;
  }

  return `${domainUrl}/`;
};

export class Slashauth {
  clientID: string;
  cacheManager: CacheManager;
  domainUrl: string;
  tokenIssuer: string;
  nonceMap: { [addr: string]: string };
  nowProvider: () => number;

  constructor(options: { clientID: string }) {
    this.domainUrl = 'https://api.slashauth.xyz';
    this.clientID = options.clientID;
    this.nowProvider = DEFAULT_NOW_PROVIDER;
    this.tokenIssuer = getTokenIssuer(null, this.domainUrl);
    this.nonceMap = {};

    const cache = new LocalStorageCache();

    this.cacheManager = new CacheManager(
      cache,
      new CacheKeyManifest(cache, this.clientID),
      this.nowProvider
    );
  }

  public isNonceFetched = (addr: string): boolean => {
    return !!this.nonceMap[addr];
  };

  public async getNonceToSign(options: GetNonceToSignOptions): Promise<string> {
    if (this.isNonceFetched(options.address)) {
      return this.nonceMap[options.address];
    }

    const queryParameters = {
      address: options.address,
      device_id: browserDeviceID,
      client_id: this.clientID,
    };

    const nonceResult = await getNonceToSign({
      baseUrl: getDomain(this.domainUrl),
      ...queryParameters,
    });

    this.nonceMap[options.address] = nonceResult.nonce;
    return nonceResult.nonce;
  }

  public async loginNoRedirectNoPopup(options: LoginNoRedirectNoPopupOptions) {
    const queryParameters = {
      address: options.address,
      signature: options.signature,
      device_id: browserDeviceID,
      client_id: this.clientID,
    };

    try {
      const authResult = await loginWithSignedNonce({
        baseUrl: getDomain(this.domainUrl),
        ...queryParameters,
      });

      const decodedToken = await this._verifyIdToken(authResult.access_token);
      const cacheEntry = {
        ...authResult,
        decodedToken,
        scope: '', //params.scope,
        audience: 'default',
        client_id: this.clientID,
      };

      await this.cacheManager.set(cacheEntry);
    } finally {
      this.nonceMap[options.address] = null;
    }
  }

  public async getAccount<TAccount extends Account>(
    options: GetAccountOptions = {}
  ): Promise<TAccount | undefined> {
    // const audience = options.audience || this.options.audience || 'default';
    const audience = options.audience || 'default';
    const scope = ''; //getUniqueScopes(this.defaultScope, this.scope, options.scope);

    const cache = await this.cacheManager.get(
      new CacheKey({
        client_id: this.clientID,
        audience,
        scope,
      })
    );

    return cache && cache.decodedToken && (cache.decodedToken.user as TAccount);
  }

  public async getIdTokenClaims(
    options: GetIdTokenClaimsOptions = {}
  ): Promise<IdToken | undefined> {
    // const audience = options.audience || this.options.audience || 'default';
    const audience = options.audience || 'default';
    const scope = '';

    const cache = await this.cacheManager.get(
      new CacheKey({
        client_id: this.clientID,
        audience,
        scope,
      })
    );

    return cache && cache.decodedToken && cache.decodedToken.claims;
  }

  public async checkSession(
    options?: GetTokenSilentlyOptions
  ): Promise<boolean> {
    try {
      await this.getTokenSilently(options);
    } catch (error) {
      return false;
    }
    return true;
  }

  public async getTokenSilently(
    options: GetTokenSilentlyOptions = {}
  ): Promise<string | GetTokenSilentlyVerboseResponse | null> {
    const { ignoreCache, ...getTokenOptions } = {
      audience: 'default',
      ignoreCache: false,
      ...options,
      scope: '',
    };

    return singlePromise(
      () =>
        this._getTokenSilently({
          ignoreCache,
          ...getTokenOptions,
        }),
      `${this.clientID}::${getTokenOptions.audience}::${getTokenOptions.scope}`
    );
  }

  public buildLogoutUrl(
    options: LogoutUrlOptions = {},
    accessToken: string
  ): string {
    if (options.client_id !== null) {
      options.client_id = options.client_id || this.clientID;
    } else {
      delete options.client_id;
    }

    if (!options.device_id) {
      options.device_id = browserDeviceID;
    }

    const { ...logoutOptions } = options;
    logoutOptions.access_token = accessToken;
    const url = this._url(`/logout?${createQueryParams(logoutOptions)}`);

    return url;
  }

  public async hasRole(roleName: string): Promise<boolean> {
    try {
      const accessToken = (await this.getTokenSilently()) as string | null;
      if (!accessToken) {
        return false;
      }
      const resp = await hasRoleAPICall({
        baseUrl: getDomain(this.domainUrl),
        clientID: this.clientID,
        roleName,
        accessToken,
      });
      return resp.hasRole;
    } catch (err) {
      return false;
    }
  }

  public async logout(options: LogoutOptions = {}): Promise<void> {
    const { localOnly, ...logoutOptions } = options;

    const postCacheClear = async (accessToken: string | null) => {
      if (localOnly) {
        return Promise.resolve();
      }
      if (accessToken) {
        const url = this.buildLogoutUrl(logoutOptions, accessToken);

        await apiLogout(url);
      } else {
        return Promise.resolve();
      }
    };

    if (this.cacheManager) {
      const accessToken = (await this.getTokenSilently()) as string;
      await this.cacheManager.clear();
      await postCacheClear(accessToken);
    } else {
      const accessToken = (await this.getTokenSilently()) as string;
      this.cacheManager.clearSync();
      await postCacheClear(accessToken);
    }
  }

  private _url(path: string) {
    const slashAuthClient = encodeURIComponent(
      btoa(JSON.stringify(DEFAULT_SLASHAUTH_CLIENT))
    );
    return `${this.domainUrl}${path}&slashauthClient=${slashAuthClient}`;
  }

  private async _getTokenSilently(
    options: GetTokenSilentlyOptions = {}
  ): Promise<string | GetTokenSilentlyVerboseResponse | null> {
    const { ignoreCache, ...getTokenOptions } = options;

    // Check the cache before acquiring the lock to avoid the latency of
    // `lock.acquireLock` when the cache is populated.
    if (!ignoreCache) {
      const entry = await this._getEntryFromCache({
        scope: getTokenOptions.scope,
        audience: getTokenOptions.audience || 'default',
        client_id: this.clientID,
        getDetailedEntry: options.detailedResponse,
      });

      if (entry) {
        return entry;
      }
    }

    if (
      await retryPromise(
        () => lock.acquireLock(GET_TOKEN_SILENTLY_LOCK_KEY, 5000),
        10
      )
    ) {
      try {
        // Check the cache a second time, because it may have been populated
        // by a previous call while this call was waiting to acquire the lock.
        if (!ignoreCache) {
          const entry = await this._getEntryFromCache({
            scope: getTokenOptions.scope,
            audience: getTokenOptions.audience || 'default',
            client_id: this.clientID,
            getDetailedEntry: options.detailedResponse,
          });

          if (entry) {
            return entry;
          }
        }

        const authResult = await this._getTokenUsingRefreshToken({
          audience: getTokenOptions.audience || 'default',
          baseUrl: getDomain(this.domainUrl),
          device_id: browserDeviceID,
        });

        await this.cacheManager.set({
          client_id: this.clientID,
          ...authResult,
        });

        if (options.detailedResponse) {
          const { id_token, access_token, expires_in } = authResult;

          return {
            id_token,
            access_token,
            expires_in,
          };
        }

        return authResult.access_token;
      } catch (err) {
        return null;
      } finally {
        await lock.releaseLock(GET_TOKEN_SILENTLY_LOCK_KEY);
      }
    } else {
      throw new TimeoutError();
    }
  }

  private async _getTokenUsingRefreshToken(
    options: RefreshTokenOptions
  ): Promise<GetTokenSilentlyResult> {
    const cache = await this.cacheManager.get(
      new CacheKey({
        scope: '', //options.scope,
        audience: options.audience || 'default',
        client_id: this.clientID,
      })
    );

    // If you don't have a refresh token in memory
    // and you don't have a refresh token in web worker memory
    // fallback to an iframe.
    if (!cache || !cache.refresh_token) {
      this.logout({
        localOnly: true,
      });
      throw new NotLoggedInError('Not logged in');
    }

    const queryParameters = {
      refresh_token: cache.refresh_token,
      device_id: browserDeviceID,
    };

    const tokenResult = await refreshToken({
      baseUrl: getDomain(this.domainUrl),
      ...queryParameters,
    });

    const decodedToken = await this._verifyIdToken(tokenResult.access_token);

    return {
      ...tokenResult,
      decodedToken,
      scope: '', //options.scope,
      audience: options.audience || 'default',
      client_id: this.clientID,
    };
  }

  private async _verifyIdToken(
    id_token: string,
    nonce?: string,
    organizationId?: string
  ) {
    const now = await this.nowProvider();

    return verifyIdToken({
      iss: this.tokenIssuer,
      aud: 'default',
      id_token,
      nonce,
      organizationId,
      now,
    });
  }

  private async _getEntryFromCache({
    scope,
    audience,
    client_id,
    getDetailedEntry = false,
  }: {
    scope: string;
    audience: string;
    client_id: string;
    getDetailedEntry?: boolean;
  }) {
    const entry = await this.cacheManager.get(
      new CacheKey({
        scope: '', //scope,
        audience,
        client_id,
      }),
      60 // get a new token if within 60 seconds of expiring
    );

    if (entry && entry.access_token) {
      if (getDetailedEntry) {
        const { id_token, access_token, oauthTokenScope, expires_in } = entry;

        return {
          id_token,
          access_token,
          ...(oauthTokenScope ? { scope: oauthTokenScope } : null),
          expires_in,
        };
      }

      return entry.access_token;
    }
  }
}
