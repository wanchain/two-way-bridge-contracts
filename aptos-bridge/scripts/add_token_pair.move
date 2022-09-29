script {
  use std::signer;
  // use bridge_root::TokenManager;
  use std::debug;

  fun main(account: signer) {
    let account_addr = signer::address_of(&account);
    debug::print<address>(&account_addr);
  }
}

