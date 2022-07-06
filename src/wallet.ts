import Web3 from 'web3';
import Web3Modal, { injected } from 'web3modal';
import WalletConnectProvider from '@walletconnect/web3-provider';
import CoinbaseWalletSDK from '@coinbase/wallet-sdk';

import { NETWORKS, NETWORK_NAME } from './constants';
import { isMobile, objectMap } from './utils';
import { Slashauth } from './slashauth';
import {
  addressChangedEvent,
  errorEvent,
  loginStepChangedEvent,
} from './events';
import { LoginStep } from './global';
import { CodedError } from './errors';

export let web3 = undefined;
export let provider = undefined;
export let web3Modal: Web3Modal | undefined = undefined;

export const isWeb3Initialized = () => {
  return web3 && provider;
};

interface ProviderMessage {
  type: string;
  data: unknown;
}

type Props = {
  forceConnect: boolean;
  isMobileOnlyInjectedProvider: boolean;
  isDesktopNoInjectedProvider: boolean;
};

export class Wallet {
  readonly appName: string;
  readonly infuraID: string;

  _address: string | null;
  _loginStep: LoginStep;

  slashauth: Slashauth;

  constructor(options: {
    appName: string;
    infuraID: string;
    slashauthClientID: string;
    darkMode?: boolean;
  }) {
    this.appName = options.appName;
    this.infuraID = options.infuraID;
    this.slashauth = new Slashauth({
      clientID: options.slashauthClientID,
    });
  }

  updateLoginStep = async () => {
    let step = LoginStep.Uninitialized;
    const accounts = await web3?.eth.getAccounts();
    if (accounts?.length) {
      step = LoginStep.Connected;

      if (this.slashauth.isNonceFetched(accounts[0])) {
        step = LoginStep.ReadyToLogin;
      }

      if (!!(await this.slashauth.getTokenSilently())) {
        step = LoginStep.LoggedIn;
      }
    } else {
      step = LoginStep.Uninitialized;
    }
    this.loginStep = step;
  };

  login = async () => {};

  init = async () => {
    await this.updateWalletStatus();
    this.updateConnectButton();
  };

  private initWeb3Modal = (
    forceConnect: boolean,
    isMobileOnlyInjectedProvider: boolean
  ) => {
    const isDesktopNoInjectedProvider = !isMobile() && !window.ethereum;

    web3Modal = new Web3Modal({
      cacheProvider: false,
      // Use custom Metamask provider because of conflicts with Coinbase injected provider
      // On mobile apps with injected web3, use ONLY injected providers
      disableInjectedProvider: !isMobileOnlyInjectedProvider,
      providerOptions: this.getWeb3ModalProviderOptions({
        forceConnect,
        isMobileOnlyInjectedProvider,
        isDesktopNoInjectedProvider,
      }),
    });

    return web3Modal;
  };

  private initWeb3 = async (forceConnect = false) => {
    if (isWeb3Initialized()) return;

    const isMobileOnlyInjectedProvider = isMobile() && window.ethereum;
    const web3Modal = this.initWeb3Modal(
      forceConnect,
      isMobileOnlyInjectedProvider
    );

    if (web3Modal.cachedProvider || forceConnect) {
      if (web3Modal.cachedProvider === 'walletconnect') {
        web3Modal.clearCachedProvider();
      }
      // this is for fixing a previous bug
      if (
        isMobileOnlyInjectedProvider &&
        web3Modal.cachedProvider !== 'injected'
      ) {
        web3Modal.clearCachedProvider();
      }
      try {
        provider = await web3Modal.connect();
        if (provider) {
          let providerID;
          if (provider.isMetaMask)
            providerID = isMobileOnlyInjectedProvider
              ? 'injected'
              : 'custom-metamask';
          if (provider.isCoinbaseWallet)
            providerID = isMobileOnlyInjectedProvider
              ? 'injected'
              : 'coinbasewallet';

          if (providerID) web3Modal.setCachedProvider(providerID);
        }
        provider.on('accountsChanged', async (accounts: string[] | null) => {
          if (accounts?.length === 0) {
            if (provider?.close) {
              await provider.close();
            }
            web3Modal.clearCachedProvider();
          }
          this.address = accounts?.at(0) || null;
        });
        provider.on('message', (message: ProviderMessage) => {
          console.log(message);
        });
      } catch (err) {
        throw new CodedError('Web3Modal error', err?.toString(), 4001);
      }
    }
    web3 = provider ? new Web3(provider) : undefined;
  };

  hasRole = async (roleName: string): Promise<boolean> => {
    return this.slashauth.hasRole(roleName);
  };

  isWalletConnected = () => {
    if (!isWeb3Initialized()) {
      return false;
    }

    return this.loginStep >= LoginStep.Connected;
  };

  disconnectWallet = () => {
    if (isWeb3Initialized()) {
      web3Modal.clearCachedProvider();
      if (provider?.close) {
        provider.close();
      }
    }
    web3 = provider = undefined;
    this.updateWalletButtonText();
  };

  getWalletAddressOrConnect = async (
    refresh?: boolean
  ): Promise<string | null> => {
    const currentAddress = async () => {
      if (!isWeb3Initialized()) {
        return null;
      }
      try {
        return (await provider?.request({ method: 'eth_requestAccounts' }))[0];
      } catch {
        await provider.enable();
        return (await web3.eth.getAccounts())[0];
      }
    };
    if (!isWeb3Initialized()) {
      await this.connectWallet();
      if (refresh) {
        window.location.reload();
      }
    }
    return await currentAddress();
  };

  getCurrentNetwork = async () => {
    return Number(await provider?.request({ method: 'net_version' }));
  };

  switchNetwork = async (networkName: NETWORK_NAME) => {
    if (!provider) {
      return;
    }
    if (networkName === (await this.getCurrentNetwork())) {
      console.log("Don't need to change network");
      return;
    }
    const chainIDHex = `0x${networkName.toString(16)}`;
    try {
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: chainIDHex }],
      });
    } catch (error) {
      // This error code indicates that the chain has not been added to MetaMask
      // if it is not, then install it into the user MetaMask
      if (error.code === 4902) {
        try {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [
              {
                chainId: chainIDHex,
                nativeCurrency: NETWORKS[networkName].currency,
                chainName: NETWORKS[networkName].name,
                rpcUrls: [NETWORKS[networkName].rpcURL],
                blockExplorerUrls: [NETWORKS[networkName].blockExplorerURL],
              },
            ],
          });
        } catch (addError) {
          console.error(addError);
        }
      }
      console.error(error);
    }
  };

  connectWallet = async () => {
    try {
      await this.initWeb3(true);
    } catch (e) {
      if (e?.code !== 4001) {
        alert(`Error in initWeb3 in connectWallet: ${e.toString()}`);
        console.error(e);
        this.getConnectButton()?.dispatchEvent(
          errorEvent({
            error: e,
            errorStr: 'Metamask error',
          })
        );
      }
      return;
    }
    this.address = await this.getWalletAddressOrConnect();
    if (this.address) {
      await this.slashauth.getNonceToSign({
        address: this.address,
      });
    }
    await this.updateWalletStatus();
  };

  getConnectButton = () => {
    const btnID = window.buttonID ?? '#connect';
    return (
      document.querySelector(btnID) ??
      document.querySelector(`a[href='${btnID}']`)
    );
  };

  updateWalletButtonText = async () => {
    await this.updateLoginStep();
    const button = this.getConnectButton();
    if (button) {
      switch (this.loginStep) {
        case LoginStep.Uninitialized:
          button.textContent = 'Connect';
          break;
        case LoginStep.Connected:
          // We need a two step flow here
          try {
            await this.slashauth.getNonceToSign({
              address: await this.getWalletAddressOrConnect(),
            });
            button.textContent = 'Login';
          } catch (err) {
            // This is an error.
            console.error(`Error fetching nonce to sign in: ${err}`);
            button.dispatchEvent(
              errorEvent({
                error: err,
                errorStr: 'Failed fetching nonce',
              })
            );
            button.textContent = 'Connect';
          }
          break;
        case LoginStep.ReadyToLogin:
          button.textContent = 'Login';
          break;
        case LoginStep.LoggedIn:
          button.textContent = 'Logout';
          break;
      }
    }
  };

  updateWalletStatus = async () => {
    try {
      await this.initWeb3();
    } catch (e: any) {
      console.log(e);
      if (e?.code !== 4001) {
        alert(`Error in initWeb3: ${e.toString()}`);
        console.error(e);
      }
    }
    await this.updateWalletButtonText();
  };

  private handleButtonClick = async () => {
    const handleConnect = async () => {
      const address = await this.getWalletAddressOrConnect(false);
      const hasNonceFetched = this.slashauth.isNonceFetched(address);
      const nonce = await this.slashauth.getNonceToSign({
        address,
      });
      if (hasNonceFetched || !isMobile()) {
        const signature = await this.signData(address, nonce);
        await this.slashauth.loginNoRedirectNoPopup({
          address,
          signature,
        });
      }

      this.updateWalletButtonText();
    };

    switch (this.loginStep) {
      case LoginStep.Uninitialized:
        await this.connectWallet();
        if (this.address && !isMobile()) {
          await handleConnect();
        }
        break;
      case LoginStep.Connected:
        await handleConnect();
        break;
      case LoginStep.ReadyToLogin:
        const address = await this.getWalletAddressOrConnect(false);
        const nonce = await this.slashauth.getNonceToSign({
          address,
        });
        const signature = await this.signData(address, nonce);
        await this.slashauth.loginNoRedirectNoPopup({
          address,
          signature,
        });
        this.updateWalletButtonText();
        break;
      case LoginStep.LoggedIn:
        await this.slashauth.logout();
        this.disconnectWallet();
        break;
    }
  };

  updateConnectButton = () => {
    const walletBtn = this.getConnectButton();
    walletBtn?.addEventListener('click', this.handleButtonClick);
  };

  get loginStep() {
    return this._loginStep;
  }

  private set loginStep(newStep: LoginStep) {
    this._loginStep = newStep;
    this.getConnectButton()?.dispatchEvent(
      loginStepChangedEvent({ step: newStep })
    );
  }

  get address() {
    return this._address;
  }

  private set address(addr: string | null) {
    this._address = addr;
    this.getConnectButton()?.dispatchEvent(
      addressChangedEvent({ address: addr })
    );
  }

  private signData = async (address: string, data: string): Promise<string> => {
    return provider?.request({
      method: 'personal_sign',
      params: [data, address],
    });
  };

  private getWeb3ModalProviderOptions = ({
    forceConnect,
    isMobileOnlyInjectedProvider,
    isDesktopNoInjectedProvider,
  }: Props) => {
    const walletConnectOptions = {
      rpc: objectMap(NETWORKS, (value) => value.rpcURL),
      qrcodeModalOptions: {
        mobileLinks: ['rainbow', 'trust', 'ledger', 'gnosis'],
        desktopLinks: ['rainbow', 'trust', 'ledger', 'gnosis'],
      },
    };

    const basicProviderOptions = {
      walletconnect: {
        display: {
          description:
            'Connect Rainbow, Trust, Ledger, Gnosis, or scan QR code',
        },
        package: WalletConnectProvider,
        options: walletConnectOptions,
      },
      coinbasewallet: {
        package: CoinbaseWalletSDK, // Required
        options: {
          appName: this.appName,
          infuraID: this.infuraID,
          chainId: NETWORK_NAME.Ethereum, // Optional. It defaults to Ethereum if not provided
        },
      },
    };
    const metamaskProvider = {
      // Use custom Metamask provider because of conflicts with Coinbase injected provider
      'custom-metamask': {
        display: {
          logo: injected.METAMASK.logo,
          name: 'MetaMask',
          description: 'Connect to your MetaMask wallet',
        },
        package: {},
        options: {},
        connector: async (_ProviderPackage, options) => {
          const mobileNotInjectedProvider = isMobile() && !window.ethereum;
          // If mobile user doesn't have injected web3
          // Open the website in the Metamask mobile app via deep link
          if (mobileNotInjectedProvider && forceConnect) {
            const link = window.location.href.replace('https://', '');
            window.open(`https://metamask.app.link/dapp/${link}`);
            return undefined;
          }

          let provider;
          if (window?.ethereum?.providers?.length > 1) {
            provider = window?.ethereum?.providers
              ?.filter((p) => p.isMetaMask)
              ?.at(0);
            console.log(
              'Found multiple injected web3 providers, using Metamask'
            );
          } else {
            provider = window?.ethereum;
          }
          await provider?.request({ method: 'eth_requestAccounts' });
          return provider;
        },
      },
    };

    // Don't show separate Metamask option on Safari, Opera, Firefox desktop
    const allProviderOptions = isDesktopNoInjectedProvider
      ? basicProviderOptions
      : {
          ...metamaskProvider,
          ...basicProviderOptions,
        };

    // Use only injected provider if it's the only wallet available
    // Built for mobile in-app browser wallets like Metamask, Coinbase
    return !isMobileOnlyInjectedProvider ? allProviderOptions : {};
  };
}
