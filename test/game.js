const Game = artifacts.require("Game");
const truffleAssert = require('truffle-assertions');
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
    })


    it("should start game success for" + accounts[0], async () => {
        const key = 'key'
        const content = '1'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.startGame(card, { value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[0] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 5
        });

        const totalGameNumber = await instance.totalGameNumber()
        assert.equal(totalGameNumber, 1)
    })

    it("should join game success for" + accounts[1], async () => {
        const key = 'key2'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.joinGame(0, card, { from: accounts[1], value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[1] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 5
        });
    })
    it("should open card success for" + accounts[1], async () => {
        const key = 'key2'
        const content = '2'
        const instance = await Game.deployed()
        const r = await instance.openCard(0, key, content, { from: accounts[1] })
        truffleAssert.eventEmitted(r, 'CardOpend', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[1] &&
                ev[2] == key &&
                ev[3] == content
        });
    })
    it("should open card success and finish game for" + accounts[0], async () => {
        const key = 'key'
        const content = '1'
        const instance = await Game.deployed()
        const r = await instance.openCard(0, key, content, { from: accounts[0] })
        truffleAssert.eventEmitted(r, 'CardOpend', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[0] &&
                ev[2] == key &&
                ev[3] == content
        });

        truffleAssert.eventEmitted(r, 'GameFinished', (ev) => {
            //  1 rock   2 paper starter should lose
            return ev[0] == 0 && ev[1] == -1
        });


        const balance0 = await web3.eth.getBalance(accounts[0])
        assert.ok(web3.utils.fromWei(balance0) < 100)

        const balance1 = await web3.eth.getBalance(accounts[1])
        assert.ok(web3.utils.fromWei(balance1) > 100)

        console.log(balance0,balance1)
    })
})