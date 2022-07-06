import './index.css';
import App from './App';
import { createRoot } from 'react-dom/client';
import { Wallet } from './wallet';

const createDOMElement = () => {
  const container = document.getElementById('root');
  return createRoot(container);
};

const renderAppContainer = () => {
  createDOMElement().render(<App />);
};

renderAppContainer();
// NOTE: We are keeping the IDs in here so it's easier to get
// started.

let clientID;
console.log(process.env.REACT_APP_BUILD);
if (true) {
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
  await wallet.updateWalletStatus();
  wallet.updateConnectButton();
});

export { renderAppContainer, Wallet };
