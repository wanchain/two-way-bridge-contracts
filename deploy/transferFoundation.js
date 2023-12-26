const hre = require("hardhat");


const FinalFoundationAddr = '0x4ced9c0ea79ee6181600777d5b6bade7f3d301bf'  
async function main() {
    let deployer = (await hre.ethers.getSigner()).address;
    console.log("deployer:", deployer)
    const network = hre.network.name
    const bip44ChainId = hre.network.config.bip44ChainId
    const scAddr = require('../deployed/'+network+'.json')
    console.log(" groupApprove address:", scAddr.groupApprove)
    
    let groupApprove = await hre.ethers.getContractAt("GroupApprove", scAddr.groupApprove);

    let tx, oldFoundation, nwFoundation
    oldFoundation = await groupApprove.foundation();
    console.log("oldFoundation:", oldFoundation )

    let intData = groupApprove.interface.encodeFunctionData('transferFoundation', [FinalFoundationAddr])
    console.log("intData: ", intData)
    tx = await groupApprove.proposal(bip44ChainId, scAddr.groupApprove, intData)
    tx = await tx.wait()
    console.log("tx event:", tx.events[0].event, tx.events[0].args)
}

main()