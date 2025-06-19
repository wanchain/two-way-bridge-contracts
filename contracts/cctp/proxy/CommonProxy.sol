// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@openzeppelin/contracts/proxy/transparent/TransparentUpgradeableProxy.sol";

contract CommonProxy is ITransparentUpgradeableProxy, TransparentUpgradeableProxy {
    constructor(address _logic, address admin_, bytes memory _data) 
        public 
        payable 
        TransparentUpgradeableProxy(_logic, admin_, _data) {}

    /**
     * @dev Changes the admin of the proxy.
     *
     * Emits an {AdminChanged} event.
     * @dev Only the admin can call this function; other callers are delegated
     */
    function changeAdmin(address newAdmin) external virtual ifAdmin {
        _changeAdmin(newAdmin);
    }
    /**
     * @dev Upgrade the implementation of the proxy.
     * @dev Only the admin can call this function; other callers are delegated
     */
    function upgradeTo(address newImplementation) external virtual ifAdmin {
        _upgradeTo(newImplementation);
    }

    /**
     * @dev Upgrade the implementation of the proxy, and then call a function from the new implementation as specified
     * by `data`, which should be an encoded function call. This is useful to initialize new storage variables in the
     * proxied contract.
     * @dev Only the admin can call this function; other callers are delegated
     */
    function upgradeToAndCall(
        address newImplementation,
        bytes calldata data
    ) external payable virtual ifAdmin {
        _upgradeToAndCall(newImplementation, data, false);
    }

    /**
     * @dev Returns the current admin.
     */
    function admin() external view returns (address admin_) {
        admin_ = _admin();
    }

    /**
     * @dev Returns the current implementation.
     */
    function implementation() external view returns (address implementation_) {
        implementation_ = _implementation();
    }
}
