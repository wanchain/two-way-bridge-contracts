
pragma solidity ^0.4.24;

contract Owned {

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    address public owner;

    constructor() public {
        owner = msg.sender;
    }

    address public newOwner;

    function changeOwner(address _newOwner) public onlyOwner {
        newOwner = _newOwner;
    }

    function acceptOwnership() public {
        if (msg.sender == newOwner) {
            owner = newOwner;
        }
    }

    function renounceOwnership() public onlyOwner {
        owner = address(0);
    }
}
