// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";


struct SetCirclePathToBip44Param {
    uint256 bip44ChainID;
    uint256 domain;
}
struct SetFeeParam {
    uint256 bip44ChainID;
    uint256 fee;
}

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

interface ICircleTokenMessengerV2 {
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external;


    function remoteTokenMessengers(uint32 domain) external view returns(bytes32 remoteTokenMessenger);
}

interface ICircleMessageTransmitterV2 {
    function receiveMessage(
        bytes calldata message,
        bytes calldata attestation
    ) external returns (bool success);

}

contract FeeV2 is ReentrancyGuard, Initializable, AccessControl {
    using SafeERC20 for IERC20;

    address public feeToAddress;
    address public feeReadSC;
    address public circleTokenMessengerSC;
    address public circleMessageTransmitterSC;
    uint256 public localChainId;

    // domain => bip44ChainID
    mapping(uint256 => uint256) public circlePathToBip44;
    // destination chain bip44ChainID => fee
    mapping(uint256 => uint256) public feeMap;


    /**
     * @notice Emitted when a DepositForBurn message is sent
     * @param burnToken address of token burnt on source domain
     * @param amount deposit amount
     * @param mintRecipient address receiving minted tokens on destination domain as bytes32
     * @param destinationDomain destination domain
     * @param destinationCaller authorized caller as bytes32 of receiveMessage() on destination domain.
     * If equal to bytes32(0), any address can broadcast the message.
     * @param maxFee maximum fee to pay on destination domain, in units of burnToken
     * @param fee fee for execution on destination domain
     * @param minFinalityThreshold the minimum finality at which the message should be attested to.
     * @param hookData optional hook for execution on destination domain
     */
    event DepositForBurnWithFee(
        address indexed burnToken,
        uint256 amount,
        bytes32 mintRecipient,
        uint32 indexed destinationDomain,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint256 fee,
        uint32 indexed minFinalityThreshold,
        bytes hookData
    );

    event UpdateFeeTo(address to);
    event UpdateFeeReadSC(address feeReadSC);


    event SetCirclePathToBip44(uint256 indexed bip44ChainID, uint256 indexed domain);
    event SetFee(uint256 indexed bip44ChainID, uint256 indexed fee);


    /** Modifier */
    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "not admin");
        _;
    }

    function initialize(address _admin, address _feeToAddress, address _feeReadSC, uint256 _localChainId, address _circleTokenMessengerSC, address _circleMessageTransmitterSC)
        external
        initializer
    {
        _setupRole(DEFAULT_ADMIN_ROLE, _admin);

        feeToAddress = _feeToAddress;
        feeReadSC = _feeReadSC;
        localChainId = _localChainId;
        circleTokenMessengerSC = _circleTokenMessengerSC;
        circleMessageTransmitterSC = _circleMessageTransmitterSC;

        emit UpdateFeeTo(_feeToAddress);
        emit UpdateFeeReadSC(_feeReadSC);
    }

    function setCirclePathToBip44(SetCirclePathToBip44Param[] calldata params) external onlyAdmin {
        for (uint256 i = 0; i < params.length; i++) {
            circlePathToBip44[params[i].domain] = params[i].bip44ChainID;
            emit SetCirclePathToBip44(params[i].bip44ChainID, params[i].domain);
        }
    }

    function setFees(SetFeeParam[] calldata params) external onlyAdmin {
        for (uint256 i = 0; i < params.length; i++) {
            feeMap[params[i].bip44ChainID] = params[i].fee;
            emit SetFee(params[i].bip44ChainID, params[i].fee);
        }
    }

    function getFees(uint256[] calldata bip44ChainIDs) public view returns(uint256[] memory fees) {
        fees = new uint256[](bip44ChainIDs.length);
        for (uint256 i = 0; i < bip44ChainIDs.length; i++) {
            uint256 fee = feeMap[bip44ChainIDs[i]];
            if (fee == 0 && feeReadSC != address(0)) {
                GetFeesReturn memory crossChainFee = IFeeReadSC(feeReadSC).getFee(GetFeesParam({
                    srcChainID: localChainId,
                    destChainID: bip44ChainIDs[i]
                }));
                fee = crossChainFee.contractFee;
            }
            fees[i] = fee;
        }
    }

    function estimateFee(uint32 destinationDomain) public view returns(uint256 fee) {
        require(circlePathToBip44[destinationDomain] != 0, "Fee: Invalid destination domain");
        uint256 bip44ChainID = circlePathToBip44[destinationDomain];
        fee = feeMap[bip44ChainID];
        if (fee == 0 && feeReadSC != address(0)) {
            GetFeesReturn memory crossChainFee = IFeeReadSC(feeReadSC).getFee(GetFeesParam({
                srcChainID: localChainId,
                destChainID: circlePathToBip44[destinationDomain]
            }));
            fee = crossChainFee.contractFee;
        }

        return fee;
    }

    /**
     * @notice Deposits and burns tokens from sender to be minted on destination domain.
     * Emits a `DepositForBurn` event.
     * @dev reverts if:
     * - insufficient fee
     * - given burnToken is not supported
     * - given destinationDomain has no Bip44 chainID registered
     * - given destinationDomain has no TokenMessenger registered
     * - transferFrom() reverts. For example, if sender's burnToken balance or approved allowance
     * to this contract is less than `amount`.
     * - burn() reverts. For example, if `amount` is 0.
     * - maxFee is greater than or equal to `amount`.
     * - MessageTransmitterV2#sendMessage reverts.
     * @param amount amount of tokens to burn
     * @param destinationDomain destination domain to receive message on
     * @param mintRecipient address of mint recipient on destination domain
     * @param burnToken token to burn `amount` of, on local domain
     * @param destinationCaller authorized caller on the destination domain, as bytes32. If equal to bytes32(0),
     * any address can broadcast the message.
     * @param maxFee maximum fee to pay on the destination domain, specified in units of burnToken
     * @param minFinalityThreshold the minimum finality at which a burn message will be attested to.
     */
    function depositForBurn(
        uint256 amount,
        uint32 destinationDomain,
        bytes32 mintRecipient,
        address burnToken,
        bytes32 destinationCaller,
        uint256 maxFee,
        uint32 minFinalityThreshold
    ) external payable nonReentrant {
        uint256 fee = estimateFee(destinationDomain);
        require(msg.value >= fee, "Fee: Insufficient fee");
        if (msg.value > fee) {
            Address.sendValue(payable(msg.sender), msg.value - fee);
        }
        if (fee > 0) {
            Address.sendValue(payable(feeToAddress), fee);
        }
        IERC20(burnToken).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(burnToken).safeApprove(circleTokenMessengerSC, amount);
        ICircleTokenMessengerV2(circleTokenMessengerSC).depositForBurn(amount, destinationDomain, mintRecipient, burnToken, destinationCaller, maxFee, minFinalityThreshold);

        bytes memory _emptyHookData = msg.data[0:0];
        emit DepositForBurnWithFee(burnToken, amount, mintRecipient, destinationDomain, destinationCaller, maxFee, fee, minFinalityThreshold, _emptyHookData);
    }

    /**
     * @notice Receive a message. Messages can only be broadcast once for a given nonce.
     * The message body of a valid message is passed to the specified recipient for further processing.
     *
     * @dev Attestation format:
     * A valid attestation is the concatenated 65-byte signature(s) of exactly
     * `thresholdSignature` signatures, in increasing order of attester address.
     * ***If the attester addresses recovered from signatures are not in
     * increasing order, signature verification will fail.***
     * If incorrect number of signatures or duplicate signatures are supplied,
     * signature verification will fail.
     *
     * Message Format:
     *
     * Field                        Bytes      Type       Index
     * version                      4          uint32     0
     * sourceDomain                 4          uint32     4
     * destinationDomain            4          uint32     8
     * nonce                        32         bytes32    12
     * sender                       32         bytes32    44
     * recipient                    32         bytes32    76
     * destinationCaller            32         bytes32    108
     * minFinalityThreshold         4          uint32     140
     * finalityThresholdExecuted    4          uint32     144
     * messageBody                  dynamic    bytes      148
     * @param message Message bytes
     * @param attestation Concatenated 65-byte signature(s) of `message`, in increasing order
     * of the attester address recovered from signatures.
     * @return success True, if successful; false, if not
     */
    function receiveMessage(bytes calldata message, bytes calldata attestation) external nonReentrant returns (bool success) {
        success = ICircleMessageTransmitterV2(circleMessageTransmitterSC).receiveMessage(message, attestation);
        /* receiveMessage
        * @notice Emitted when a new message is received
        * @param caller Caller (msg.sender) on destination domain
        * @param sourceDomain The source domain this message originated from
        * @param nonce The nonce unique to this message
        * @param sender The sender of this message
        * @param finalityThresholdExecuted The finality at which message was attested to
        * @param messageBody message body bytes
        event MessageReceived(
            address indexed caller,
            uint32 sourceDomain,
            bytes32 indexed nonce,
            bytes32 sender,
            uint32 indexed finalityThresholdExecuted,
            bytes messageBody
        );
        */
    }

    function setFeeToAddress(address _feeToAddress) external onlyAdmin {
        feeToAddress = _feeToAddress;
        emit UpdateFeeTo(_feeToAddress);
    }

    function setFeeReadSC(address _feeReadSC) external onlyAdmin {
        feeReadSC = _feeReadSC;
        emit UpdateFeeReadSC(_feeReadSC);
    }

}
