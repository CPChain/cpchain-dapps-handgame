// Deploy Example
var Game = artifacts.require("./Game.sol");

module.exports = function (deployer) {
    deployer.deploy(Game, 'GAME_COIN', 'GAME_COIN', 1, 1000); //"参数在第二个变量携带"
};
