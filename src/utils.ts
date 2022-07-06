export const dirtyFixConnectWalletUI = () => {
  const web3ModalElem = document.querySelector('.web3modal-modal-card');
  if (web3ModalElem?.lastChild) {
    web3ModalElem?.insertBefore(
      web3ModalElem.lastChild,
      web3ModalElem.firstChild
    );
  }
};

export const objectMap = (
  object: Record<string, any>,
  mapFn: (val: any) => any
): Record<string, any> => {
  return Object.keys(object).reduce((result, key) => {
    result[key] = mapFn(object[key]);
    return result;
  }, {} as Record<string, any>);
};

export const isMobile = () =>
  /Mobi/i.test(window.navigator.userAgent) ||
  /iPhone|iPod|iPad/i.test(navigator.userAgent);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const createQueryParams = (params: any) => {
  return Object.keys(params)
    .filter((k) => typeof params[k] !== 'undefined')
    .map((k) => encodeURIComponent(k) + '=' + encodeURIComponent(params[k]))
    .join('&');
};

// https://stackoverflow.com/questions/30106476/
const decodeB64 = (input: string) =>
  decodeURIComponent(
    atob(input)
      .split('')
      .map((c) => {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      })
      .join('')
  );

export const urlDecodeB64 = (input: string) =>
  decodeB64(input.replace(/_/g, '/').replace(/-/g, '+'));
