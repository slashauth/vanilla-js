import { DEFAULT_SLASHAUTH_CLIENT } from './constants';
import {
  GetNonceToSignEndpointOptions,
  GetNonceToSignResponse,
  GetRoleMetadataOptions,
  GetRoleMetadataResponse,
  HasRoleOptions,
  HasRoleResponse,
  LoginWithSignedNonceOptions,
  LoginWithSignedNonceResponse,
  RefreshTokenOptions,
  RefreshTokenResponse,
} from './global';
import { switchFetch, getJSON } from './http';
import { createQueryParams } from './utils';

export async function logout(url: string) {
  return await switchFetch(url, 'default', '', {
    method: 'GET',
    headers: {
      'X-SlashAuth-Client': Buffer.from(
        JSON.stringify(DEFAULT_SLASHAUTH_CLIENT),
        'utf-8'
      ).toString('base64'),
    },
  });
}

export async function getNonceToSign({
  baseUrl,
  ...options
}: GetNonceToSignEndpointOptions) {
  const queryString = createQueryParams(options);
  return await getJSON<GetNonceToSignResponse>(
    `${baseUrl}/getNonceToSign?${queryString}`,
    1000,
    'default',
    '',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SlashAuth-Client': Buffer.from(
          JSON.stringify(DEFAULT_SLASHAUTH_CLIENT),
          'utf-8'
        ).toString('base64'),
      },
    }
  );
}

export async function loginWithSignedNonce({
  baseUrl,
  ...options
}: LoginWithSignedNonceOptions) {
  const queryString = createQueryParams(options);
  return await getJSON<LoginWithSignedNonceResponse>(
    `${baseUrl}/loginWithSignedNonce?${queryString}`,
    1000,
    'default',
    '',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SlashAuth-Client': Buffer.from(
          JSON.stringify(DEFAULT_SLASHAUTH_CLIENT),
          'utf-8'
        ).toString('base64'),
      },
    }
  );
}

export async function refreshToken({
  baseUrl,
  ...options
}: RefreshTokenOptions) {
  const queryString = createQueryParams(options);
  return await getJSON<RefreshTokenResponse>(
    `${baseUrl}/refresh_token?${queryString}`,
    1000,
    'default',
    '',
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-SlashAuth-Client': Buffer.from(
          JSON.stringify(DEFAULT_SLASHAUTH_CLIENT),
          'utf-8'
        ).toString('base64'),
      },
    }
  );
}

export const hasRoleAPICall = async ({
  baseUrl,
  clientID,
  roleName,
  accessToken,
}: HasRoleOptions): Promise<HasRoleResponse> => {
  const queryString = createQueryParams({
    role: Buffer.from(roleName).toString('base64'),
    encoded: true,
  });
  return await getJSON<HasRoleResponse>(
    `${baseUrl}/p/${clientID}/has_role?${queryString}`,
    1000,
    'default',
    '',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-SlashAuth-Client': Buffer.from(
          JSON.stringify(DEFAULT_SLASHAUTH_CLIENT)
        ).toString('base64'),
      },
    }
  );
};

export const getRoleMetadataAPICall = async ({
  baseUrl,
  clientID,
  roleName,
  accessToken,
}: GetRoleMetadataOptions): Promise<GetRoleMetadataResponse> => {
  const queryString = createQueryParams({
    role: Buffer.from(roleName).toString('base64'),
  });
  return await getJSON<GetRoleMetadataResponse>(
    `${baseUrl}/p/${clientID}/role_metadata?${queryString}`,
    1000,
    'default',
    '',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-SlashAuth-Client': Buffer.from(
          JSON.stringify(DEFAULT_SLASHAUTH_CLIENT)
        ).toString('base64'),
      },
    }
  );
};
