# SUI CCTP Helper Contracts

## Setup

```bash
npm install
npm run build
npm run test
```

## Testnet deployment

### CCTP Helper 

Package ID:
  - 0xbb06a0fa00fda53b18b82fa36abdfabdbbf53dbc42d51ea80065f8de10a25a87

FeeConfig Object: 
  - 0x5273632246b772b26a1c48692c97a77d0dcafe0bcc87d601073c2961b7cf8338 (Shared)

UpgradeCap Object: 
  - 0xc821780a8bbef96cb26418ca2a7f9e8b247b48afd4b166f2a4155e032f021646 (Account)

FeeCollectorConfig Object: 
  - 0xbdcf21edcbec352410280158a54be106f8c26e51f731d26b461b222187aff8ff (Shared)

### CCTP Official

Sui Domain ID: 8

Sui Testnet Package IDs:

---

MessageTransmitter: 0x4931e06dce648b3931f890035bd196920770e913e43e45990b383f6486fdd0a5
TokenMessengerMinter: 0x31cc14d80c175ae39777c0238f20594c6d4869cfab199f40b69f3319956b8beb
USDC: 0xa1ec7fc00a6f40db9693ad1415d0c193ad3906494428cf252621037bd7117e29
Stablecoin: 0x346e3233f61eb0055713417bfaddda7dc3bf26816faad1f7606994a368b92917

Sui Testnet State Object IDs

---

MessageTransmitter State: 0x98234bd0fa9ac12cc0a20a144a22e36d6a32f7e0a97baaeaf9c76cdc6d122d2e
TokenMessengerMinter State: 0x5252abd1137094ed1db3e0d75bc36abcd287aee4bc310f8e047727ef5682e7c2
USDC Treasury: 0x7170137d4a6431bf83351ac025baf462909bffe2877d87716374fb42b9629ebe

Branch with testnet Move.tomls: https://github.com/circlefin/sui-cctp/tree/testnet?tab=readme-ov-file#cctp-as-a-dependency

Iris URL (same as other chains): https://iris-api-sandbox.circle.com/


https://docs.google.com/document/d/1-bvp7IYKcHRhayI7RlAhD5Un3fChrxaCxtQUp4DPyTs/edit?usp=sharing

## Mainnet deployment

### CCTP Helper 

Package ID: 
 - 0x16b03acd7aa1fd34e913282b69ebd778951db2a4a55b4015f1d7f0d5a7f40b2d

FeeConfig Object: 
 - 0xbb93514a7e8774a4f9aca575793f766e3a21d0a936785129be4f99c0263e1d0f

UpgradeCap Object: 
 - 0x4590529e44de28c9644425ca680d85e2c6c4c54e21e8351ec4c924ff6c83aae8

FeeCollectorConfig Object: 
 - 0xc259516354cac6854e0b40b135a6eec493a55c03f1d865e9c4c4e74f69d8c4cf

### CCTP Official

Sui Domain ID: 8

Sui Mainnet Package IDs:
________________________

MessageTransmitter: 0x08d87d37ba49e785dde270a83f8e979605b03dc552b5548f26fdf2f49bf7ed1b

TokenMessengerMinter: 0x2aa6c5d56376c371f88a6cc42e852824994993cb9bab8d3e6450cbe3cb32b94e

USDC: 0xdba34672e30cb065b1f93e3ab55318768fd6fef66c15942c9f7cb846e2f900e7

Stablecoin: 0xecf47609d7da919ea98e7fd04f6e0648a0a79b337aaad373fa37aac8febf19c8

____________________________

MessageTransmitter State: 0xf68268c3d9b1df3215f2439400c1c4ea08ac4ef4bb7d6f3ca6a2a239e17510af

TokenMessengerMinter State: 0x45993eecc0382f37419864992c12faee2238f5cfe22b98ad3bf455baf65c8a2f

USDC Treasury: 0x57d6725e7a8b49a7b2a612f6bd66ab5f39fc95332ca48be421c3229d514a6de7

Iris URL (same as other chains): https://iris-api.circle.com/