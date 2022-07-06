import { LoginStep } from './global';

export const initializedEvent = () => new Event('slashauth_ready');
export const loginStepChangedEvent = (detail: { step: LoginStep }) =>
  new CustomEvent('slashauth_loginstepchanged', { detail });
export const addressChangedEvent = (detail: { address: string | null }) =>
  new CustomEvent('slashauth_addresschanged', { detail });
export const fetchingNonceEvent = () => new Event('slasahuth_fetchingnonce');
export const loggingInEvent = () => new Event('slasahauth_loggingin');
export const errorEvent = (detail: { error?: Error; errorStr?: string }) =>
  new CustomEvent('slashauth_error', {
    detail,
  });
