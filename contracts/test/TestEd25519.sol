pragma solidity ^0.4.24;
import "../interfaces/ICurve.sol";
contract  TestEd25519 {
    address public ed25519Curve;
    uint public retX;
    uint public retY;

    function mulG(uint256 scalar)
    external 
    {
	(retX,retY,)=ICurve(ed25519Curve).mulG(scalar);
    }

    function setCurve (address add) external{
        ed25519Curve= add;
    }
}
