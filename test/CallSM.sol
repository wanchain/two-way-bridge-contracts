pragma solidity ^0.4.24;

import "truffle/Assert.sol";
import "truffle/DeployedAddresses.sol";
import "../contracts/storemanGroupAdmin/StoremanGroupDelegate.sol";

contract CallSM {
    //address tsmg = address(0x82Ee15a21e8a584aF87EdDC9f32E22F1Ca22f37b);
    address tsmg = DeployedAddresses.StoremanGroupDelegate();
    StoremanGroupDelegate sm = StoremanGroupDelegate(tsmg);

    function test2() public {
        bytes32  groupId = hex"0000000000000000000000000000000000000031353839323531313433323235";
        bytes memory gpk = hex"ab112233445566778899001122334455667788990011223344556677889900112233445566778899001122334455667788990011223344556677889900ccddeeff";
        sm.setGpk(groupId,gpk);
    }
}




