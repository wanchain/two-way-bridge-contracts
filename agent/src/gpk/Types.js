const GroupStatus = {
  Init: 0, PolyCommit: 1, Negotiate: 2, Complete: 3, Close: 4
}

const CheckStatus = {
  Init: 0, Valid: 1, Invalid: 2
}

module.exports = {
  GroupStatus,
  CheckStatus
};