async function sendAndGetReason(objFunc, args, options) {
  let receipt = null;
  try {
    receipt = await objFunc(...args, options);
  } catch (e) {
    return {reason: e.reason || e.message || JSON.stringify(e), receipt: null};
  }

  console.log(JSON.stringify(receipt));
  return {reason: null, receipt: receipt};
}

module.exports = {
  sendAndGetReason,
};