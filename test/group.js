const Game = artifacts.require("Game");
const truffleAssert = require('truffle-assertions');
const gasUsed = [0, 0, 0, 0, 0]
const sleep = time => {
    return new Promise(resolve => setTimeout(resolve, time));
};
contract("Test Game ", (accounts) => {
    it("should get contract params success for " + accounts[0], async () => {
        const instance = await Game.deployed()
        const maxLimit = await instance.maxLimit()
        const timeoutLimit = await instance.timeoutLimit()
        assert.equal(web3.utils.fromWei(maxLimit), 1000)
        assert.equal(timeoutLimit, 10 * 60)
    })
    it("contract game number should be 0", async () => {
        const instance = await Game.deployed()
        const totalGameNumber = await instance.totalGameNumber()
        assert.equal(totalGameNumber, 0)
    })
    it("should change contract params success for owner", async () => {
        const instance = await Game.deployed()
        const result1 = await instance.setMaxLimit(web3.utils.toWei(new web3.utils.BN(2000)))
        const result2 = await instance.setTimeoutLimit(5)
        truffleAssert.eventEmitted(result1, 'SetMaxLimit', (ev) => {
            return web3.utils.fromWei(ev.limit) == 2000
        });
        truffleAssert.eventEmitted(result2, 'SetTimeoutLimit', (ev) => {
            return ev.limit == 5
        });
        const maxLimit = await instance.maxLimit()
        const timeoutLimit = await instance.timeoutLimit()
        assert.equal(web3.utils.fromWei(maxLimit), 2000)
        assert.equal(timeoutLimit, 5)
        gasUsed[0] = gasUsed[0] + result1.receipt.gasUsed + result2.receipt.gasUsed
    })
   



})

