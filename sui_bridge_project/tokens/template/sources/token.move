module TOKEN_NAME::TOKEN_NAME {
    use sui::coin::Self;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::option;

    /// Token type
    struct TOKEN_NAME has drop {}

    /// Initialization function
    fun init(witness: TOKEN_NAME, ctx: &mut TxContext) {
        // Create currency
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 
            DECIMALS, // Decimals
            b"TOKEN_SYMBOL", 
            b"TOKEN_FULL_NAME", 
            b"TOKEN_DESCRIPTION", 
            option::none(), 
            ctx
        );
        
        // Transfer TreasuryCap to deployer (can be transferred to cross contract later)
        transfer::public_transfer(treasury_cap, tx_context::sender(ctx));
        
        // Share metadata publicly
        transfer::public_share_object(metadata);
    }
    
    // Note: mint and burn functions are removed as these operations will be handled by the cross contract
}
