// Deploy Example
var Game = artifacts.require("./Game.sol");

module.exports = function (deployer) {
    deployer.deploy(Game); //"参数在第二个变量携带"
};
