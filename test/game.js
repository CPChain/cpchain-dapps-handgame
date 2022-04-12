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
        const content = '1'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
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

        gasUsed[1] = gasUsed[1] + r.receipt.gasUsed
    })
    it("should open card success for" + accounts[1], async () => {
        const key = 'key2'
        const content = '2'
        const instance = await Game.deployed()
        const r = await instance.openCard(0, key, content, { from: accounts[1] })
        truffleAssert.eventEmitted(r, 'CardOpened', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[1] &&
                ev[2] == key &&
                ev[3] == content
        });

        gasUsed[1] = gasUsed[1] + r.receipt.gasUsed
    })

    it("should open card failed with wrong key or content" + accounts[0], async () => {
        try {
            const key = 'key'
            const content = '3'
            const instance = await Game.deployed()
            await instance.openCard(0, key, content, { from: accounts[0] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('wrong key or content'))
        }
    })

    it("should open card success and finish game for" + accounts[0], async () => {
        const key = 'key'
        const content = '1'
        const instance = await Game.deployed()
        const r = await instance.openCard(0, key, content, { from: accounts[0] })
        truffleAssert.eventEmitted(r, 'CardOpened', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[0] &&
                ev[2] == key &&
                ev[3] == content
        });

        truffleAssert.eventEmitted(r, 'GameFinished', (ev) => {
            //  1 rock   2 paper starter should lose
            return ev[0] == 0 && ev[1] == -1
        });

        gasUsed[0] = gasUsed[0] + r.receipt.gasUsed
    })

    it(accounts[1] + " should win cpc", async () => {
        const balance1 = await web3.eth.getBalance(accounts[1])
        assert.ok(web3.utils.fromWei(new web3.utils.BN(gasUsed[1]).add(new web3.utils.BN(balance1))) == 105)
    })

    it("should start game2", async () => {
        const instance = await Game.deployed()
        const key = 'key_2'
        const content = '1'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(5)), { value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == 1
        });

    })

    it("should get game1 success and get game2 failed", async () => {
        const instance = await Game.deployed()
        const game2 = await instance.viewGame(1)
        assert.ok(game2[3] == 0)
        try {
            await instance.viewGame(2)
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('wrong game id'))
        }
    })

    // test cancel 
    it("should cancel game failed for owner ", async () => {
        try {
            const instance = await Game.deployed()
            const gameId = 1
            await instance.cancelGame(gameId)
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('need game time out'))
        }
    })

    it("should change contract timeout success for owner", async () => {
        const instance = await Game.deployed()
        const result = await instance.setTimeoutLimit(1)
        truffleAssert.eventEmitted(result, 'SetTimeoutLimit', (ev) => {
            return ev.limit == 1
        });
    })
    let gameId = 2
    it("should start game 2", async () => {
        const instance = await Game.deployed()
        const key = 'key_2'
        const content = '1'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(5)), { value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId &&
                ev[1] == accounts[0] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 5
        });

    })

    it("should should cancel game failed for:" + accounts[1], async () => {
        try {
            const instance = await Game.deployed()
            await instance.cancelGame(gameId, { from: accounts[1] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('need game starter'))
        }
    })

    it("should cancel game success for owner  ", async () => {
        const instance = await Game.deployed()
        await sleep(5 * 1000)
        const c = await instance.cancelGame(gameId)
        truffleAssert.eventEmitted(c, 'GameCancelled', (ev) => {
            return ev[0] == gameId
        });
    })

    it("should cancel game failed for owner  ", async () => {
        try {
            const instance = await Game.deployed()
            await instance.cancelGame(gameId)
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('wrong game status'))
        }
    })

    const gameId3 = 3
    it("should start game 3 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key = 'key_3'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId3 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 3 failed because balance is less than 10 for " + accounts[3], async () => {
        try {
            const key = 'key2_3'
            const content = '2'
            const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
            const instance = await Game.deployed()
            await instance.joinGame(gameId3, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(5)) })
        } catch (error) {
            assert.ok(error.toString().includes('wrong balance'))
        }


    })

    it("should join game 3 success for " + accounts[3], async () => {
        const key = 'key2_3'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId3, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(15)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId3
        });
    })

    it("should finsh game  3", async () => {
        const instance = await Game.deployed()
        const key2 = 'key_3'
        const content2 = '2'
        const r2 = await instance.openCard(gameId3, key2, content2, { from: accounts[2] })

        truffleAssert.eventEmitted(r2, 'CardOpened', (ev) => {
            return ev[0] == gameId3 &&
                ev[1] == accounts[2] &&
                ev[2] == key2 &&
                ev[3] == content2
        });
        const key3 = 'key2_3'
        const content3 = '2'

        await sleep(1000)
        const r3 = await instance.openCard(gameId3, key3, content3, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'CardOpened', (ev) => {
            return ev[0] == gameId3 &&
                ev[1] == accounts[3] &&
                ev[2] == key3 &&
                ev[3] == content3
        });


        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId3 && ev[1] == 0
        });

    })



    const gameId4 = 4
    it("should start game 4 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key = 'key_3'
        const content = '3'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId4 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 4 success for " + accounts[3], async () => {
        const key = 'key2_3'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId4, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId4
        });
    })

    it("should open card failed for " + accounts[4], async () => {
        try {
            const instance = await Game.deployed()
            const key2 = 'key_3'
            const content2 = '3'
            const r2 = await instance.openCard(gameId4, key2, content2, { from: accounts[4] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('need game player'))
        }
    })

    it("should open card failed for " + accounts[2], async () => {
        try {
            const instance = await Game.deployed()
            const key2 = 'key_3'
            const content2 = '4'
            const r2 = await instance.openCard(gameId4, key2, content2, { from: accounts[2] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('wrong content'))
        }
    })



    it("should finsh game 4", async () => {
        const instance = await Game.deployed()
        const key2 = 'key_3'
        const content2 = '3'
        const r2 = await instance.openCard(gameId4, key2, content2, { from: accounts[2] })
        truffleAssert.eventEmitted(r2, 'CardOpened', (ev) => {
            return ev[0] == gameId4 &&
                ev[1] == accounts[2] &&
                ev[2] == key2 &&
                ev[3] == content2
        });
        const key3 = 'key2_3'
        const content3 = '2'
        await sleep(1000)
        const r3 = await instance.openCard(gameId4, key3, content3, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'CardOpened', (ev) => {
            return ev[0] == gameId4 &&
                ev[1] == accounts[3] &&
                ev[2] == key3 &&
                ev[3] == content3
        });
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId4 && ev[1] == 1
        });
    })


    const gameId5 = 5
    it("should start game 5 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key = 'key_3'
        const content = '3'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId5 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 5 success for " + accounts[3], async () => {
        const key = 'key2_3'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId5, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId5
        });
    })

    it("it is time out for game 5", async () => {
        const instance = await Game.deployed()
        await sleep(5 * 1000)
        const r3 = await instance.finshGame(gameId5, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId5 && ev[1] == 0
        });
    })


    const gameId6 = 6
    it("should start game 6 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key = 'key_3'
        const content = '3'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId6 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 6 success for " + accounts[3], async () => {
        const key = 'key2_3'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId6, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId6
        });
    })

    it("should open card for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key2 = 'key_3'
        const content2 = '3'
        await instance.openCard(gameId6, key2, content2, { from: accounts[2] })
    })


    it("it is time out for game 6", async () => {
        const instance = await Game.deployed()
        await sleep(5 * 1000)
        const r3 = await instance.finshGame(gameId6, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId6 && ev[1] == 1
        });
    })

    const gameId7 = 7
    it("should start game 7 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key = 'key_3'
        const content = '3'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId7 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 7 success for " + accounts[3], async () => {
        const key = 'key2_3'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId7, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId7
        });
    })

    it("should open card for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key2 = 'key2_3'
        const content2 = '2'
        await instance.openCard(gameId7, key2, content2, { from: accounts[3] })
    })


    it("it is time out for game 7", async () => {
        const instance = await Game.deployed()
        await sleep(5 * 1000)
        const r3 = await instance.finshGame(gameId7, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId7 && ev[1] == -1
        });
    })

    // threshold
    const gameId8 = 8
    it("should start game 8 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const key = 'key_3'
        const content = '3'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const r = await instance.startGame(card, web3.utils.toWei(new web3.utils.BN(8)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId8 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 8 failed for " + accounts[3], async () => {
        try {
            const key = 'key2_3'
            const content = '2'
            const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
            const instance = await Game.deployed()
            await instance.joinGame(gameId8, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(7)) })
            assert.fail()

        } catch (error) {
            assert.ok(error.toString().includes('wrong balance'))
        }
    })

    it("should join game 8 success for " + accounts[3], async () => {
        const key = 'key2_3'
        const content = '2'
        const card = web3.utils.sha3(web3.utils.toHex(key) + content, { encoding: "hex" })
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId8, card, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(8)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId8
        });
    })

    it("should open card for " + accounts[3], async () => {
        const instance = await Game.deployed()
        const key2 = 'key2_3'
        const content2 = '2'
        await instance.openCard(gameId8, key2, content2, { from: accounts[3] })
    })


    it("it is time out for game 8", async () => {
        const instance = await Game.deployed()
        await sleep(5 * 1000)
        const r3 = await instance.finshGame(gameId8, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId8 && ev[1] == -1
        });
    })


    it("should get lastest games failed for limit is too high", async () => {
        const instance = await Game.deployed()
        try {
            await instance.viewLatestGames(100)
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('limit is too high'))
        }
    })

    it("should get lastest 2 games", async () => {
        const instance = await Game.deployed()
        const games = await instance.viewLatestGames(2)
        assert.ok(games.length == 2 * 7)

    })


})

