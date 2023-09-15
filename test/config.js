const networks = {
  nodeploy: {
    from: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
    admin: "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606",
  },
  development: {
    from: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
    admin: "0x5793e629c061e7fd642ab6a1b4d552cec0e2d606",
  },
  local: {
    from: "0xEf73Eaa714dC9a58B0990c40a01F4C0573599959",
    admin: "0xdF0A667F00cCfc7c49219e81b458819587068141",
  },
  testnet: {
    from: "0x9da26fc2e1d6ad9fdd46138906b0104ae68a65d8",
    admin: "0x2d0e7c0813a51d3bd1d08246af2a8a7a57d8922e",
  },
  testnetRpc: {
    from: "0xEf73Eaa714dC9a58B0990c40a01F4C0573599959",
    admin: "0xEf73Eaa714dC9a58B0990c40a01F4C0573599959",
  },

  coverage: {
    admin: "0xdF0A667F00cCfc7c49219e81b458819587068141",
  },
};

exports.networks = networks;
