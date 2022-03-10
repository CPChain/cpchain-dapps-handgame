const Game = artifacts.require("Game");
contract("Test Game ", (accounts) => {
    it("should register success for " + accounts[0], async () => {
        const instance = await Game.deployed()
        const maxLimit = await instance.maxLimit()
        console.log(maxLimit)
    })

})
