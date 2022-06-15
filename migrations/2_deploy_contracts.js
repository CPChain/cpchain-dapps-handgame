// Deploy Example
var Game = artifacts.require("./Game.sol");
var RPS = artifacts.require("./RPS.sol");
var GroupChatMock = artifacts.require("./GroupChatMock.sol");
module.exports = function (deployer) {
    deployer.deploy(Game)
    deployer.deploy(RPS)
    process.env.NODE_ENV == 'dev' && deployer.deploy(GroupChatMock)
    // deployer.deploy(RPS).then(async () => {
    //     try {
    //         await deployer.deploy(Game); //"参数在第二个变量携带"   
    //         process.env.NODE_ENV == 'dev' && await deployer.deploy(GroupChatMock)
    //     } catch (error) {
    //         console.warn(error)
    //     }
    // })
};
