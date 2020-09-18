pragma solidity 0.4.26;
contract ReentrancyGuard {
    bool private _notEntered;

    constructor () internal {
        _notEntered = true;
    }
    modifier nonReentrant() {

        require(_notEntered, "ReentrancyGuard: reentrant call");
        _notEntered = false;

        _;
        _notEntered = true;
    }
}
