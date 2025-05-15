module TOKEN_NAME::TOKEN_NAME {
    use sui::coin::Self;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::option;

    /// Token type
    struct TOKEN_SYMBOL has drop {}

    /// Initialization function
    fun init(witness: TOKEN_SYMBOL, ctx: &mut TxContext) {
        // Create currency
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 
            DECIMALS, // Decimals
            b"TOKEN_SYMBOL", 
            b"TOKEN_NAME", 
            b"TOKEN_DESCRIPTION", 
            option::none(), 
            ctx
        );
        
        // Transfer TreasuryCap to deployer (can be transferred to cross contract later)
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        
        // Share metadata publicly
        transfer::public_share_object(metadata);
    }
    
    /// Mint new tokens
    /// @param treasury_cap: The treasury capability for the token
    /// @param amount: The amount of tokens to mint
    /// @param recipient: The address to receive the minted tokens
    public entry fun mint(
        treasury_cap: &mut coin::TreasuryCap<TOKEN_SYMBOL>,
        amount: u64,
        recipient: address,
        ctx: &mut TxContext
    ) {
        // Mint new tokens
        let new_tokens = coin::mint(treasury_cap, amount, ctx);
        // Transfer the minted tokens to the recipient
        transfer::public_transfer(new_tokens, recipient);
    }

    /// Burn tokens
    /// @param treasury_cap: The treasury capability for the token
    /// @param coin: The coin to burn
    public entry fun burn(
        treasury_cap: &mut coin::TreasuryCap<TOKEN_SYMBOL>,
        coin: coin::Coin<TOKEN_SYMBOL>
    ) {
        // Burn the tokens
        coin::burn(treasury_cap, coin);
    }
}
