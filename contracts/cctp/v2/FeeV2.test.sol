// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/Address.sol";


interface IFeeV2 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external payable ;

    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);

    function estimateFee(uint32 destinationDomain) external view returns(uint256 fee);

}

contract FeeV2Test {
    using SafeERC20 for IERC20;

    function doubleDepositForBurn(
        address feeV2,
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external payable {
        uint256 fee = IFeeV2(feeV2).estimateFee(destinationDomain);
        uint256 feeDouble = fee * 2;
        require(msg.value >= feeDouble, "Fee: Insufficient fee");
        if (msg.value > feeDouble) {
            Address.sendValue(payable(msg.sender), msg.value - feeDouble);
        }
        IERC20(burnToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(burnToken).safeApprove(feeV2, amount);

        uint256 amount1 = amount / 2;
        IFeeV2(feeV2).depositForBurn{value: fee}(amount1, destinationDomain, mintRecipient, burnToken, destinationCaller, maxFee, minFinalityThreshold);

        uint256 amount2 = amount - amount1;
        IFeeV2(feeV2).depositForBurn{value: fee}(amount2, destinationDomain, mintRecipient, burnToken, destinationCaller, maxFee, minFinalityThreshold);
    }
}
