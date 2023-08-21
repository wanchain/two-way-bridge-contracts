pragma solidity ^0.4.26;

contract MockCross {
    bool public halted;
    address public oracle;
    address public sigVerifier;
    uint public chainId;
    address public owner;

    constructor(address _oracle, address _sigVerifier, uint256 _chainId) public {
        oracle = _oracle;
        sigVerifier = _sigVerifier;
        chainId = _chainId;
        owner = msg.sender;
    }

    function setHalt(bool _halt) external {
        halted = _halt;
    }

    function getPartners() external view returns(address tokenManager, address smgAdminProxy, address smgFeeProxy, address quota, address _sigVerifier) {
        return (address(0), oracle, address(0), address(0), sigVerifier);
    }

    function currentChainID() external view returns (uint256) {
        return chainId;
    }

    function transferOwnership(address newOwner) external {
        require(msg.sender == owner, "only owner can transfer ownership");
        owner = newOwner;
    }
}
