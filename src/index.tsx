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
const wallet = new Wallet({
  appName: 'slashauth',
  infuraID: 'ed0a2b655d424e718cc0d2d1a65a056d',
});
document.addEventListener('DOMContentLoaded', async () => {
  await wallet.updateWalletStatus();
  wallet.updateConnectButton();
});

export { renderAppContainer, Wallet };
