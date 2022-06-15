const Game = artifacts.require("Game");
const RPS = artifacts.require("RPS");
const truffleAssert = require('truffle-assertions');
const gasUsed = [0, 0, 0, 0, 0]
const sleep = time => {
    return new Promise(resolve => setTimeout(resolve, time));
};

const cardGenerate = (key, value) => {
    const b1 = Buffer.alloc(32);
    const b2 = Buffer.alloc(32);
    b1.write(key);
    b2[31] = value
    const card = web3.utils.sha3('0x' + b1.toString('hex') + b2.toString('hex'), { encoding: "hex" })
    const proof = '0x' + b1.toString('hex')
    const content = '0x' + b2.toString('hex')
    return [card, proof, content]
}

const [card, proof, content] = cardGenerate('proof', 1)
const [card2, proof2, content2] = cardGenerate('proof2', 2)
const [card3, proof3, content3] = cardGenerate('proof3', 3)
const [card4, proof4, content4] = cardGenerate('proof4', 1)
const [card5, proof5, content5] = cardGenerate('proof5', 1)
const [card6, proof6, content6] = cardGenerate('proof6', 1)
const [card7, proof7, content7] = cardGenerate('proof7', 2)
const [card8, proof8, content8] = cardGenerate('proof8', 2)
const [card9, proof9, content9] = cardGenerate('proof9', 3)
const [card10, proof10, content10] = cardGenerate('proof10', 3)
const [card11, proof11, content11] = cardGenerate('proof11', 3)
contract("Test Game ", (accounts) => {
    it("should get contract params success for " + accounts[0], async () => {
        try {
            const rps = await RPS.deployed()
            const instance = await Game.deployed()
            await instance.setRPS(rps.address)
            await rps.setMintContract(instance.address)
            const maxLimit = await instance.maxLimit()
            const timeoutLimit = await instance.timeoutLimit()
            assert.equal(timeoutLimit, 24 * 60 * 60)
            assert.equal(web3.utils.fromWei(maxLimit), 1000)
        } catch (error) {
            console.log(error)
        }
    })

    it("should mint rps failed for " + accounts[1], async () => {
        try {
            const rps = await RPS.deployed()
            await rps.mintRPS(accounts[1], 1, { from: accounts[1] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('Ownable: caller is not the minter'))
        }
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
    it("should change contract params failed for owner", async () => {
        const instance = await Game.deployed()
        try {
            await instance.setMaxLimit(web3.utils.toWei(new web3.utils.BN(0.1)))
        } catch (error) {
            assert.ok(error.toString().includes('limit to low'))
        }
    })
    it("should start game success for" + accounts[0], async () => {

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
        try {
            const instance = await Game.deployed()
            const r = await instance.joinGame(0, card2, { from: accounts[1], value: web3.utils.toWei(new web3.utils.BN(5)) })
            truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
                return ev[0] == 0 &&
                    ev[1] == accounts[1] &&
                    web3.utils.toHex(ev[2]) == card &&
                    web3.utils.fromWei(ev[3]) == 5
            });
            gasUsed[1] = gasUsed[1] + r.receipt.gasUsed
        } catch (error) {
        }


    })
    it("should get score:" + accounts[1], async () => {
        const rps = await RPS.deployed()
        const b0 = web3.utils.fromWei(await rps.balanceOf(accounts[0]))
        const b1 = web3.utils.fromWei(await rps.balanceOf(accounts[1]))
        assert.ok(b0 == 2)
        assert.ok(b1 == 1)
    })

    it("should open card success for" + accounts[1], async () => {
        try {
            const instance = await Game.deployed()
            const r = await instance.openCard(0, proof2, content2, { from: accounts[1] })

            truffleAssert.eventEmitted(r, 'CardOpened', (ev) => {
                return ev[0] == 0 &&
                    ev[1] == accounts[1] &&
                    web3.utils.toHex(ev[2]) == proof2 &&
                    web3.utils.toNumber(ev[3]) == content2
            });

            gasUsed[1] = gasUsed[1] + r.receipt.gasUsed
        } catch (error) {
            console.log(error)
        }

    })

    it("should open card failed with wrong key or content" + accounts[0], async () => {
        try {

            const instance = await Game.deployed()
            await instance.openCard(0, proof, content2, { from: accounts[0] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('wrong key or content'))
        }
    })

    it("should open card success and finish game for" + accounts[0], async () => {

        const instance = await Game.deployed()
        const r = await instance.openCard(0, proof, content, { from: accounts[0] })
        truffleAssert.eventEmitted(r, 'CardOpened', (ev) => {
            return ev[0] == 0 &&
                ev[1] == accounts[0] &&
                web3.utils.toHex(ev[2]) == proof &&
                web3.utils.toNumber(ev[3]) == content
        });
        const game = await instance.viewGame(0)
        assert.ok(game[4] == 2)
        truffleAssert.eventEmitted(r, 'GameFinished', (ev) => {
            return ev[0] == 0 && ev[1] == -1
        });

        gasUsed[0] = gasUsed[0] + r.receipt.gasUsed
    })

    it(accounts[1] + " should win cpc", async () => {
        const balance1 = await web3.eth.getBalance(accounts[1])
        assert.ok(web3.utils.fromWei(new web3.utils.BN(gasUsed[1]).add(new web3.utils.BN(balance1))) > 100)
    })

    it("should start game2", async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card3, web3.utils.toWei(new web3.utils.BN(5)), { value: web3.utils.toWei(new web3.utils.BN(5)) })
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

    // // test cancel
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
        const result = await instance.setTimeoutLimit(4)
        truffleAssert.eventEmitted(result, 'SetTimeoutLimit', (ev) => {
            return ev.limit == 4
        });
    })
    let gameId = 2
    it("should start game 2", async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card3, web3.utils.toWei(new web3.utils.BN(5)), { value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId &&
                ev[1] == accounts[0] &&
                web3.utils.toHex(ev[2]) == card3 &&
                web3.utils.fromWei(ev[3]) == 5
        });

    })

    it("should should cancel game failed for:" + accounts[1], async () => {
        try {
            const instance = await Game.deployed()
            await instance.cancelGame(gameId, { from: accounts[1] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('need game player'))
        }
    })

    it("should join game failed for time out  ", async () => {
        const instance = await Game.deployed()
        await sleep(10 * 1000)
        try {
            const c = await instance.joinGame(gameId, card2, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(5)) })
        } catch (error) {
            assert.ok(error.toString().includes('time is out'))
        }
    })

    it("should cancel game success for owner  ", async () => {
        const instance = await Game.deployed()
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
        const r = await instance.startGame(card2, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId3 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card2 &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 3 failed because balance is less than 10 for " + accounts[3], async () => {
        try {
            const instance = await Game.deployed()
            await instance.joinGame(gameId3, card2, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(5)) })
        } catch (error) {
            assert.ok(error.toString().includes('wrong balance'))
        }
    })

    it("should join game 3 success for " + accounts[3], async () => {
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId3, card2, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(15)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId3
        });
    })


    it("should finsh game 3", async () => {
        const instance = await Game.deployed()
        try {
            const r3 = await instance.openCard(gameId3, proof2, content2, { from: accounts[3] })
            truffleAssert.eventEmitted(r3, 'CardOpened', (ev) => {
                return ev[0] == gameId3 &&
                    ev[1] == accounts[3] &&
                    web3.utils.toHex(ev[2]) == proof2 &&
                    web3.utils.toNumber(ev[3]) == content2
            });
            truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
                return ev[0] == gameId3 && ev[1] == 0
            });
        } catch (error) {
            console.log(error)
            assert.fail()
        }
    })

    const gameId4 = 4
    it("should start game 4 for " + accounts[2], async () => {
        const instance = await Game.deployed()

        const r = await instance.startGame(card4, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId4 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card4 &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 4 success for " + accounts[3], async () => {
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId4, card5, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId4
        });
    })

    it("should open card failed for " + accounts[4], async () => {
        try {
            const instance = await Game.deployed()
            await instance.openCard(gameId4, proof4, content4, { from: accounts[4] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('need game player'))
        }
    })

    it("should open card failed for " + accounts[2], async () => {
        try {
            const instance = await Game.deployed()
            await instance.openCard(gameId4, proof2, content2, { from: accounts[2] })
            assert.fail()
        } catch (error) {
            assert.ok(error.toString().includes('wrong key or content'))
        }
    })

    it("should finsh game 4", async () => {
        const instance = await Game.deployed()

        try {
            const r2 = await instance.openCard(gameId4, proof4, content4, { from: accounts[2] })
            truffleAssert.eventEmitted(r2, 'CardOpened', (ev) => {
                return ev[0] == gameId4 &&
                    ev[1] == accounts[2] &&
                    web3.utils.toHex(ev[2]) == proof4 &&
                    web3.utils.toNumber(ev[3]) == content4
            });

            await sleep(1000)
            const r3 = await instance.openCard(gameId4, proof5, content5, { from: accounts[3] })
            truffleAssert.eventEmitted(r3, 'CardOpened', (ev) => {
                return ev[0] == gameId4 &&
                    ev[1] == accounts[3] &&
                    web3.utils.toHex(ev[2]) == proof5 &&
                    web3.utils.toNumber(ev[3]) == content5
            });
            truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
                return ev[0] == gameId4 && ev[1] == 0
            });
        } catch (error) {
            console.log(error)
        }

    })


    const gameId5 = 5
    it("should start game 5 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card6, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId5 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card6 &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 5 success for " + accounts[3], async () => {
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId5, card3, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId5
        });
    })

    it("it is time out for game 5", async () => {
        const instance = await Game.deployed()
        await sleep(10 * 1000)
        const r3 = await instance.finishTimeoutGame(gameId5, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId5 && ev[1] == 0
        });
    })


    const gameId6 = 6
    it("should start game 6 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card3, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId6 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card3 &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 6 success for " + accounts[3], async () => {

        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId6, card6, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId6
        });
    })

    it("should open card for " + accounts[2], async () => {
        const instance = await Game.deployed()
        await instance.openCard(gameId6, proof3, content3, { from: accounts[2] })
    })


    it("it is time out for game 6", async () => {
        const instance = await Game.deployed()
        await sleep(10 * 1000)
        const r3 = await instance.finishTimeoutGame(gameId6, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId6 && ev[1] == 1
        });
    })

    const gameId7 = 7
    it("should start game 7 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card7, web3.utils.toWei(new web3.utils.BN(10)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(10)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId7 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card7 &&
                web3.utils.fromWei(ev[3]) == 10
        });
    })

    it("should join game 7 success for " + accounts[3], async () => {

        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId7, card8, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(10)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId7
        });
    })

    it("should open card for " + accounts[3], async () => {
        const instance = await Game.deployed()
        await instance.openCard(gameId7, proof8, content8, { from: accounts[3] })
    })


    it("it is time out for game 7", async () => {
        const instance = await Game.deployed()
        await sleep(10 * 1000)
        const r3 = await instance.finishTimeoutGame(gameId7, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId7 && ev[1] == -1
        });
    })

    // threshold
    const gameId8 = 8
    it("should start game 8 for " + accounts[2], async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card9, web3.utils.toWei(new web3.utils.BN(5)), { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(50)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId8 &&
                ev[1] == accounts[2] &&
                web3.utils.toHex(ev[2]) == card9 &&
                web3.utils.fromWei(ev[3]) == 50 &&
                web3.utils.fromWei(ev[4]) == 5
        });
    })

    it("should join game 8 failed for " + accounts[3], async () => {
        try {

            const instance = await Game.deployed()
            await instance.joinGame(gameId8, card6, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(4)) })


        } catch (error) {
            assert.ok(error.toString().includes('wrong balance'))
        }
    })

    it("should join game 8 success for " + accounts[3], async () => {

        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId8, card6, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(8)) })

        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId8
        });
    })

    it("should open card for " + accounts[3], async () => {
        const instance = await Game.deployed()
        await instance.openCard(gameId8, proof6, content6, { from: accounts[3] })
    })


    it("it is time out for game 8", async () => {
        const instance = await Game.deployed()
        await sleep(10 * 1000)
        const r3 = await instance.finishTimeoutGame(gameId8, { from: accounts[3] })
        truffleAssert.eventEmitted(r3, 'GameFinished', (ev) => {
            return ev[0] == gameId8 && ev[1] == -1
        });
    })

    it("should get ERC2 current", async () => {
        const rps = await RPS.deployed()
        const b0 = web3.utils.fromWei(await rps.balanceOf(accounts[0]))
        const b1 = web3.utils.fromWei(await rps.balanceOf(accounts[1]))
        const b2 = web3.utils.fromWei(await rps.balanceOf(accounts[2]))
        const b3 = web3.utils.fromWei(await rps.balanceOf(accounts[3]))
        const b4 = web3.utils.fromWei(await rps.balanceOf(accounts[4]))
        assert.ok(b0 == 4)
        assert.ok(b1 == 4)
        assert.ok(b2 == 18)
        assert.ok(b3 == 15)
        assert.ok(b4 == 0)
    })

    const [creater, starter, player, win, lose, draw] = [10, 9, 8, 30, 5, 12]

    it("should change mint config success", async () => {
        const instance = await Game.deployed()
        const result1 = await instance.setMintConfig(
            web3.utils.toWei(new web3.utils.BN(creater)),  // cteater
            web3.utils.toWei(new web3.utils.BN(starter)),  // locked starter
            web3.utils.toWei(new web3.utils.BN(player)),  // locked player
            web3.utils.toWei(new web3.utils.BN(win)), // win
            web3.utils.toWei(new web3.utils.BN(lose)),  //lose
            web3.utils.toWei(new web3.utils.BN(draw))   //draw
        )
        truffleAssert.eventEmitted(result1, 'SetMintConfig', (ev) => {
            return web3.utils.fromWei(ev.starterMint) == creater &&
                web3.utils.fromWei(ev.staterLockMint) == starter &&
                web3.utils.fromWei(ev.playerLockMint) == player &&
                web3.utils.fromWei(ev.winnerMint) == win &&
                web3.utils.fromWei(ev.loserMint) == lose &&
                web3.utils.fromWei(ev.drawMint) == draw
        });
    })

    const gameId9 = 9
    it("should start game  9 for " + accounts[0], async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card9, web3.utils.toWei(new web3.utils.BN(5)), { from: accounts[0], value: web3.utils.toWei(new web3.utils.BN(50)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId9 &&
                ev[1] == accounts[0] &&
                web3.utils.toHex(ev[2]) == card9 &&
                web3.utils.fromWei(ev[3]) == 50 &&
                web3.utils.fromWei(ev[4]) == 5
        });
    })
    it(`should add ${creater} rps for ` + accounts[0], async () => {
        const rps = await RPS.deployed()
        const b0 = web3.utils.fromWei(await rps.balanceOf(accounts[0]))
        assert.ok(b0 == 4 + creater)
    })


    it("should join game 9 success for " + accounts[3], async () => {
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId9, card7, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(8)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId9
        });
    })

    it(`should add ${starter, player} rps for  game 9`, async () => {
        const rps = await RPS.deployed()
        const b0 = web3.utils.fromWei(await rps.balanceOf(accounts[0]))
        const b3 = web3.utils.fromWei(await rps.balanceOf(accounts[3]))
        assert.ok(b0 == 4 + creater + starter)
        assert.ok(b3 == 15 + player)
    })

    it("should open card  ", async () => {
        const instance = await Game.deployed()
        await instance.openCard(gameId9, proof7, content7, { from: accounts[3] })
        await instance.openCard(gameId9, proof9, content9)
    })


    it(`should add ${win, lose} rps for  game 9`, async () => {
        const rps = await RPS.deployed()
        const b0 = web3.utils.fromWei(await rps.balanceOf(accounts[0]))
        const b3 = web3.utils.fromWei(await rps.balanceOf(accounts[3]))
        assert.ok(b0 == 4 + creater + starter + win)
        assert.ok(b3 == 15 + player + lose)
    })
    const gameId10 = 10
    it("should start game  10 for " + accounts[0], async () => {
        const instance = await Game.deployed()
        const r = await instance.startGame(card10, web3.utils.toWei(new web3.utils.BN(5)), { from: accounts[0], value: web3.utils.toWei(new web3.utils.BN(50)) })
        truffleAssert.eventEmitted(r, 'GameStarted', (ev) => {
            return ev[0] == gameId10 &&
                ev[1] == accounts[0] &&
                web3.utils.toHex(ev[2]) == card10 &&
                web3.utils.fromWei(ev[3]) == 50 &&
                web3.utils.fromWei(ev[4]) == 5
        });
    })

    it("should join game 10 success for " + accounts[3], async () => {
        const instance = await Game.deployed()
        const r = await instance.joinGame(gameId10, card11, { from: accounts[3], value: web3.utils.toWei(new web3.utils.BN(8)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == gameId10
        });
    })

    it("should open card  ", async () => {
        const instance = await Game.deployed()
        await instance.openCard(gameId10, proof11, content11, { from: accounts[3] })
        await instance.openCard(gameId10, proof10, content10)
    })

    it(`should add ${win, lose} rps for  game 10`, async () => {
        const rps = await RPS.deployed()
        const b0 = web3.utils.fromWei(await rps.balanceOf(accounts[0]))
        const b3 = web3.utils.fromWei(await rps.balanceOf(accounts[3]))
        assert.ok(b0 == 4 + creater + starter + win + creater + starter + draw)
        assert.ok(b3 == 15 + player + lose + player + draw)
    })


})

