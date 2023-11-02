const { expect } = require("chai");

contract("Admin", function () {
  let owner, admin, other, adminSc;
  before("init ......", async () => {
    [owner, admin, other] = await hre.ethers.getSigners();
    let Admin = await ethers.getContractFactory("Admin");
    adminSc = await Admin.deploy()
    await adminSc.deployed();
  });

  it("[Admin_addAdmin] should revert with Not owner", async function () {
    await expect(adminSc.connect(admin).addAdmin(admin.address)).to.be.revertedWith("Not owner");
  });

  it("[Admin_addAdmin] success", async function () {
    await adminSc.connect(owner).addAdmin(admin.address);
  });

  it("[Admin_removeAdmin] should revert with Not owner", async function () {
    await expect(adminSc.connect(admin).removeAdmin(admin.address)).to.be.revertedWith("Not owner");
  });

  it("[Admin_removeAdmin] success", async function () {
    await adminSc.connect(owner).removeAdmin(admin.address);
  });

});