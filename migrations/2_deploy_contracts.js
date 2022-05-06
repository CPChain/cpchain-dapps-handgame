// Deploy Example
var Game = artifacts.require("./Game.sol");
var RPS = artifacts.require("./RPS.sol");
var GroupChatMock = artifacts.require("./GroupChatMock.sol");
module.exports = function (deployer) {

    deployer.deploy(RPS).then(async () => {
        try {
            const rps = await RPS.deployed()
            await deployer.deploy(Game, rps.address); //"参数在第二个变量携带"   
            process.env.NODE_ENV == 'dev' && await deployer.deploy(GroupChatMock)
        } catch (error) {
            console.warn(error)
        }
    })
};
