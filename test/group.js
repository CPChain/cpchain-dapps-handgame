const Game = artifacts.require("Game");
const RPS = artifacts.require("RPS");
const truffleAssert = require('truffle-assertions');
const gasUsed = [0, 0, 0, 0, 0]
contract("Test Game ", (accounts) => { 
    it("should get contract params success for " + accounts[0], async () => {
        try {
            const rps = await RPS.deployed()
            const instance = await Game.deployed()
            const maxLimit = await instance.maxLimit()
            const timeoutLimit = await instance.timeoutLimit()
    
            assert.equal(web3.utils.fromWei(maxLimit), 1000)
            assert.equal(timeoutLimit, 10 * 60)
        } catch (error) {
            console.log(33333333,error)
        }
     
    })

})

