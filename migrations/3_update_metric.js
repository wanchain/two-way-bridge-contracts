const MetricProxy     = artifacts.require('MetricProxy');
const MetricDelegate  = artifacts.require('MetricDelegate');


module.exports = async function(deployer){

    //deploy metric
    let metricProxyAddr='0x8e84b41800d7915aD3fF9E6bbba434c7ca99fB95';
    let smgProxyAddr='0x49fde469b39389Cd93999A3Ec092143C01c5f411';


    let metricProxy = await MetricProxy.at(metricProxyAddr);

    await deployer.deploy(MetricDelegate);
    let metricDlg = await MetricDelegate.deployed();

    await metricProxy.upgradeTo(metricDlg.address);

    let metric = await MetricDelegate.at(metricProxyAddr);
    await metric.setDependence(smgProxyAddr,smgProxyAddr);

}
