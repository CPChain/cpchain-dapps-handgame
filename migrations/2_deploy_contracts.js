// Deploy Example
var Game = artifacts.require("./Game.sol");
var RPS = artifacts.require("./RPS.sol");
module.exports = function (deployer) {
    deployer.deploy(RPS).then(async () => {
        try {
            const rps = await RPS.deployed()
            const game = await deployer.deploy(Game, rps.address); //"参数在第二个变量携带"  
        } catch (error) {
            console.warn(error)
        }
    })
};

// Deploying RPS contract...
// Contract RPS address is 0x5735fF66e6656e0E442196fa6CFDFBb2b3ef34E2
// Deploying Game contract...
// Contract Game address is 0x24daD4627cC0303D0935bba05cd0717f839493C3


// # build contracts
// npm run build

// # deploy on testnet (Specify your keystore)
// cpchain-cli contract deploy --keystore <The path of your keystore>  -c build/contracts/MyContract.json --endpoint https://civilian.testnet.cpchain.io --chainID 41

// # if need deploy multiple contracts which writes in migrations, you can use deploy-truffle command
// cpchain-cli contract deploy-truffle --keystore <The path of your keystore> --endpoint https://civilian.testnet.cpchain.io --chainID 41 -P <Project Path>
