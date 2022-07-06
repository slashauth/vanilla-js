export const dirtyFixConnectWalletUI = () => {
  const web3ModalElem = document.querySelector(".web3modal-modal-card");
  if (web3ModalElem?.lastChild) {
    web3ModalElem?.insertBefore(web3ModalElem.lastChild, web3ModalElem.firstChild);
  }
}

export const objectMap = (object: Record<string, any>, mapFn: (val: any) => any): Record<string, any> => {
  return Object.keys(object).reduce((result, key) => {
      result[key] = mapFn(object[key]);
      return result
  }, {} as Record<string, any>);
}

export const isMobile = () => /Mobi/i.test(window.navigator.userAgent)
    || /iPhone|iPod|iPad/i.test(navigator.userAgent);