// Deploy Example
var Game = artifacts.require("./Game.sol");
var RPS = artifacts.require("./RPS.sol");
module.exports = function (deployer) {
    deployer.deploy(RPS).then(async () => {
        const rps = await RPS.deployed()
        const game = await deployer.deploy(Game, rps.address); //"参数在第二个变量携带" 
        await rps.transferOwnership(game.address)
    })
};
