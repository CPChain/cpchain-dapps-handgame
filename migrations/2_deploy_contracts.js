// Deploy Example
var Starter = artifacts.require("./Starter.sol");

module.exports = function (deployer) {
        deployer.deploy(Starter); //"参数在第二个变量携带"
};
