
pragma solidity ^0.4.26;

library RapidityTxLib {
    enum TxStatus {None, Redeemed}
    struct Data {

        mapping(bytes32 => TxStatus) mapTxStatus;

    }
    function addRapidityTx(Data storage self, bytes32 uniqueID)
        internal
    {
        TxStatus status = self.mapTxStatus[uniqueID];
        require(status == TxStatus.None, "Rapidity tx exists");
        self.mapTxStatus[uniqueID] = TxStatus.Redeemed;
    }
}
