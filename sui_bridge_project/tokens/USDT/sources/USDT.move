module USDT::USDT {
    use sui::coin::Self;
    use sui::transfer;
    use sui::tx_context::{Self, TxContext};
    use std::option;

    /// Token type
    struct USDT has drop {}

    /// Initialization function
    fun init(witness: USDT, ctx: &mut TxContext) {
        // Create currency
        let (treasury_cap, metadata) = coin::create_currency(
            witness, 
            6, // Decimals
            b"USDT", 
            b"USDT", 
            b"Wrapped USDT by Wanchain", 
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
