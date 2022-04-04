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
        const result2 = await instance.setTimeoutLimit(5 * 60)
        truffleAssert.eventEmitted(result1, 'SetMaxLimit', (ev) => {
            return web3.utils.fromWei(ev.limit) == 2000
        });
        truffleAssert.eventEmitted(result2, 'SetTimeoutLimit', (ev) => {
            return ev.limit == 5 * 60
        });
        const maxLimit = await instance.maxLimit()
        const timeoutLimit = await instance.timeoutLimit()
        assert.equal(web3.utils.fromWei(maxLimit), 2000)
        assert.equal(timeoutLimit, 5 * 60)
        gasUsed[0] = gasUsed[0] + result1.receipt.gasUsed + result2.receipt.gasUsed
    })

    it("should change contract params failed for owner", async () => {
        const instance = await Game.deployed()
        try {
            await instance.setMaxLimit(web3.utils.toWei(new web3.utils.BN(0.1)))
        } catch (error) {
            assert.ok(error.toString().includes('limit to low'))
        }

    })



    it("should start game success for" + accounts[0], async () => {
        const key = 'key'
        const content = '02'
        console.log(11111111, web3.utils.toHex(key),web3.utils.toHex(key) + content)
        const card = web3.utils.sha3('0xe1dc4c7fc802087c75cee74d519ec7418b73077aed02958810562c3e0ac2308f' + content, { encoding: "hex" })
        console.log(222222222222, card)
        const instance = await Game.deployed()
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(5)), { value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[0] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 5
        });

        const totalGameNumber = await instance.totalGameNumber()
        assert.equal(totalGameNumber, 1)
        gasUsed[0] = gasUsed[0] + r.receipt.gasUsed
    })


})

