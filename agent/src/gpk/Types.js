const GroupStatus = {
  Init: 0, PolyCommit: 1, Gpk: 2, Negotiate: 3, Complete: 4, Close: 5
}

const CheckStatus = {
  Init: 0, Valid: 1, Invalid: 2
}

module.exports = {
  GroupStatus,
  CheckStatus
};