script {
  use std::signer;
  // use BridgeRoot::TokenManager;
  use std::debug;

  fun main(account: signer) {
    let account_addr = signer::address_of(&account);
    debug::print<address>(&account_addr);
  }
}

