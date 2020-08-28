// SPDX-License-Identifier: MIT
pragma solidity 0.7.0;

contract  FakeBnCurve {
    address constant PRECOMPILE_CONTRACT_ADDR = 0x268;
    bool public checkSigResult = true;
    bool public addResult = true;
    bool public mulGResult = true;
    bool public calPolyCommitResult = true;
    bool public mulPkResult = true;
    bool public equalPtRes = true;

    function add(uint256 x1, uint256 y1, uint256 x2, uint256 y2)
    public
    view
    returns(uint256 retx, uint256 rety, bool success)
    {
        return (0,0,addResult);
    }

    function mulG(uint256 scalar)
    public
    view
    returns(uint256 x, uint256 y, bool success)
    {
        return (0,0,mulGResult);
    }

    function calPolyCommit(bytes memory polyCommit, bytes memory pk)
    public
    view
    returns(uint256 sx, uint256 sy, bool success)
    {
        return (0,0,calPolyCommitResult);
    }

    function mulPk(uint256 scalar, uint256 xPk, uint256 yPk)
    public
    view
    returns (uint256 x, uint256 y, bool success){
        return (0,0,mulPkResult);
    }

    function equalPt (uint256 xLeft, uint256 yLeft,uint256 xRight, uint256 yRight) public view returns(bool){
        return equalPtRes;
    }

    // set
    function setCheckSig (bool checkSigRes) public {
        checkSigResult = checkSigRes;
    }

    function setAddResult (bool res) public {
        addResult = res;
    }

    function setMulGResult (bool res) public {
        mulGResult = res;
    }

    function setCalPolyCommitResult (bool res) public {
        calPolyCommitResult = res;
    }

    function setMulPkResult (bool res) public {
        mulPkResult = res;
    }

    function setEqualPtRes (bool res) public {
        equalPtRes = res;
    }

    function checkSig (bytes32 hash, bytes32 r, bytes32 s, bytes memory pk) public view returns(bool) {
        return checkSigResult;
    }
}