import { initializedEvent } from './events';
import { LoginStep } from './global';
import { Wallet } from './wallet';

let clientID;
if (process.env.REACT_APP_BUILD === 'development') {
  clientID = 'eUDLHSDMLRX1TDOQ';
} else {
  clientID = document?.currentScript?.getAttribute('clientID');
}

if (!clientID) {
  throw new Error('Pass `clientID` to the script as it is required!');
}

const wallet = new Wallet({
  appName: 'slashauth',
  infuraID: 'ed0a2b655d424e718cc0d2d1a65a056d',
  slashauthClientID: clientID,
});
document.addEventListener('DOMContentLoaded', async () => {
  await wallet.init();
  wallet.getConnectButton()?.dispatchEvent(initializedEvent());
});

export { wallet, LoginStep };
