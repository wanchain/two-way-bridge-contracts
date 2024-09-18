
import {Bridge} from "../wrappers/Bridge"; // this is the interface class from step 7

export async function run() {
  const bridge = await Bridge.deploy();

  console.log("contract address:", bridge.address.toString());
}

