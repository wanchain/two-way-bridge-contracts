pragma solidity ^0.4.24;

contract  FakeSkCurve {
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;
    bool public checkSigResult;

    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
    public
    view
    returns(uint256 retx, uint256 rety, bool success)
    {
        return (0,0,true);
    }

    function mulG(uint256 scalar)
    public
    view
    returns(uint256 x, uint256 y, bool success)
    {
        return (0,0,true);
    }

    function calPolyCommit(bytes polyCommit, bytes pk)
    public
    view
    returns(uint256 sx, uint256 sy, bool success)
    {
        return (0,0,true);
    }

    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success){
        return (0,0,true);
    }

    function setCheckSig (bool checkSigRes) public {
        checkSigResult = checkSigRes;
    }

    function checkSig (bytes32 hash, bytes32 r, bytes32 s, bytes pk) public view returns(bool) {
        return checkSigResult;
    }
}