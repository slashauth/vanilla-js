export enum NETWORK_NAME {
  Ethereum = 1,
  Rinkeby = 4,
  Polygon = 137,
  Mumbai = 80001,
}

export const NETWORKS = {
  1: {
    name: 'Ethereum',
    rpcURL: 'https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    testnetID: 4,
    blockExplorerURL: 'https://etherscan.io',
  },
  4: {
    name: 'Rinkeby',
    rpcURL: 'https://rinkeby.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
    currency: {
      name: 'Ether',
      symbol: 'ETH',
      decimals: 18,
    },
    testnetID: 4,
    blockExplorerURL: 'https://rinkeby.etherscan.io',
  },
  137: {
    name: 'Polygon',
    rpcURL: 'https://polygon-rpc.com/',
    currency: {
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18,
    },
    testnetID: 80001,
    blockExplorerURL: 'https://polygonscan.com',
  },
  80001: {
    name: 'Mumbai',
    rpcURL: 'https://rpc-mumbai.maticvigil.com/',
    currency: {
      name: 'Matic',
      symbol: 'MATIC',
      decimals: 18,
    },
    testnetID: 80001,
    blockExplorerURL: 'https://mumbai.polygonscan.com',
  },
};
