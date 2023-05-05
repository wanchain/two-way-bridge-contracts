// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";

struct GetFeesParam {
    uint256 srcChainID;
    uint256 destChainID;
}

struct GetFeesReturn {
    uint256 contractFee;
    uint256 agentFee;
}

interface IFeeReadSC {
    function getFee(GetFeesParam memory param) external view returns(GetFeesReturn memory fee);
}

interface ICircleTokenMessenger {
    function depositForBurn(
        uint256 amount, 
        uint32 destinationDomain, 
        bytes32 mintRecipient, 
        address burnToken) external;
}

interface ICircleMessageTransmitter {
    function receiveMessage(
        bytes calldata message, 
        bytes calldata attestation) external;
}

contract Fee is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    address public feeToAddress;
    address public feeReadSC;
    address public circleTokenMessengerSC;
    address public circleMessageTransmitterSC;
    uint256 public localChainId;

    mapping(uint256 => uint256) public circlePathToBip44;

    event DepositForBurnWithFee(
        uint256 amount, 
        uint32 destinationDomain, 
        bytes32 mintRecipient, 
        address burnToken,
        uint256 fee
    );
    
    event UpdateFeeTo(address to);

    event MintToken(bytes32 mintRecipient, address token);

    constructor(address _feeToAddress, address _feeReadSC, uint256 _localChainId, address _circleTokenMessengerSC, address _circleMessageTransmitterSC) {
        feeToAddress = _feeToAddress;
        feeReadSC = _feeReadSC;
        localChainId = _localChainId;
        circleTokenMessengerSC = _circleTokenMessengerSC;
        circleMessageTransmitterSC = _circleMessageTransmitterSC;
    }

    function setFeeToAddress(address _feeToAddress) external onlyOwner {
        feeToAddress = _feeToAddress;
        emit UpdateFeeTo(_feeToAddress);
    }

    function setCirclePathToBip44(uint256 _circlePath, uint256 _bip44) external onlyOwner {
        circlePathToBip44[_circlePath] = _bip44;
    }

    function estimateFee(uint32 destinationDomain) public view returns(uint256) {
        require(circlePathToBip44[destinationDomain] != 0, "Fee: Invalid destination domain");
        GetFeesReturn memory fee = IFeeReadSC(feeReadSC).getFee(GetFeesParam({
            srcChainID: localChainId,
            destChainID: circlePathToBip44[destinationDomain]
        }));
        
        return fee.contractFee;
    }

    function depositForBurn(
        uint256 amount, 
        uint32 destinationDomain, 
        bytes32 mintRecipient, 
        address burnToken) external payable nonReentrant {
        uint256 fee = estimateFee(destinationDomain);
        require(msg.value >= fee, "Fee: Insufficient fee");
        if (msg.value > fee) {
            Address.sendValue(payable(msg.sender), msg.value - fee);
        }
        Address.sendValue(payable(feeToAddress), fee);
        IERC20(burnToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(burnToken).safeApprove(circleTokenMessengerSC, amount);
        ICircleTokenMessenger(circleTokenMessengerSC).depositForBurn(amount, destinationDomain, mintRecipient, burnToken);
        emit DepositForBurnWithFee(amount, destinationDomain, mintRecipient, burnToken, fee);
    }

    function receiveMessage(bytes calldata message, bytes calldata attestation, bytes32 mintRecipient, address token) external nonReentrant {
        ICircleMessageTransmitter(circleMessageTransmitterSC).receiveMessage(message, attestation);
        emit MintToken(mintRecipient, token);
    }
}
