# zkSync Hardhat project

This project was scaffolded with [zksync-cli](https://github.com/matter-labs/zksync-cli).

## Project structure

- `/contracts`: smart contracts.
- `/deploy`: deployment and contract interaction scripts.
- `/test`: test files
- `hardhat.config.ts`: configuration file.

## Commands

- `yarn hardhat compile` will compile the contracts.
- `yarn run deploy` will execute the deployment script `/deploy/deploy-greeter.ts`. Requires [environment variable setup](#environment-variables).
- `yarn run greet` will execute the script `/deploy/use-greeter.ts` which interacts with the Greeter contract deployed.
- `yarn test`: run tests. **Check test requirements below.**

Both `yarn run deploy` and `yarn run greet` are configured in the `package.json` file and run `yarn hardhat deploy-zksync`.

### Environment variables

In order to prevent users to leak private keys, this project includes the `dotenv` package which is used to load environment variables. It's used to load the wallet private key, required to run the deploy script.

To use it, rename `.env.example` to `.env` and enter your private key.

```
WALLET_PRIVATE_KEY=123cde574ccff....
```

### Local testing

In order to run test, you need to start the zkSync local environment. Please check [this section of the docs](https://v2-docs.zksync.io/api/hardhat/testing.html#prerequisites) which contains all the details.

If you do not start the zkSync local environment, the tests will fail with error `Error: could not detect network (event="noNetwork", code=NETWORK_ERROR, version=providers/5.7.2)`

## Official Links

- [Website](https://zksync.io/)
- [Documentation](https://v2-docs.zksync.io/dev/)
- [GitHub](https://github.com/matter-labs)
- [Twitter](https://twitter.com/zksync)
- [Discord](https://discord.gg/nMaPGrDDwk)

### EVM deploy
1. export PK='......your account PK .....'   
2. npx hardhat --config hardhat.config.ts   run deploy/deploy-EVM.js --network wanTestnet

### Zksync deploy
1. export PK='......your account PK .....'  
2. rm -rf artifacts-zk
3. npx hardhat --config hardhat.config.ts compile --network zkSyncTestnet
4. un-commit the libraries deploy code in deploy.ts file
5. npx hardhat --config hardhat.config.ts deploy-zksync --script deploy/deploy.ts --network zkSyncTestnet
6. after deploy the library, commit the libraries deploy code in deploy.ts file.
7. fill the library address in hardhat.config.ts file.
8. rm -rf artifacts-zk
9. npx hardhat --config hardhat.config.ts compile --network zkSyncTestnet
10. must recompile it, otherwise it will not work
11. npx hardhat --config hardhat.config.ts deploy-zksync --script deploy/deploy.ts --network zkSyncTestnet

### transfer owner

npx hardhat --config hardhat.config.ts --network zkSyncTestnet run deploy/transferOwner.js


### verify
see： https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify#adding-support-for-other-networks

The hardhat verify plugin supports only etherscan compatible explorer。
Please use 'npx hardhat verify --list-networks' to check if your chain is supported。
if you are sure your chain is etherscan compatible， please add your chain in customChains section   
1. verify use command
npx hardhat --network <your_network_name> verify <the_sc_address>
2. verify use js
npx hardhat --network <your_network_name> run deploy/verifySc.js 

### transfer foundation 
npx hardhat --network polyZkMainnet  run deploy/transferOwner.js

