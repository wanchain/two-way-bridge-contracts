
pragma solidity 0.4.26;

interface ITokenManager {
    function getTokenPairInfo(uint id) external view
      returns (uint origChainID, bytes tokenOrigAccount, uint shadowChainID, bytes tokenShadowAccount);

    function mintToken(uint id, address to,uint value) external;

    function burnToken(uint id, uint value) external;
}
