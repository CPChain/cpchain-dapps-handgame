const Game = artifacts.require("Game");
const RPS = artifacts.require("RPS");
const { assert } = require('chai');
const truffleAssert = require('truffle-assertions');
const GroupChatMock = artifacts.require("GroupChatMock");


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

contract("Test Game ", (accounts) => {
    it("should set chat address for owner ", async () => {
        try {
            const group = await GroupChatMock.deployed()
            console.log(group.address)
            const rps = await RPS.deployed()
            const instance = await Game.deployed()

            await instance.setGroupChat(group.address)
            const chatAddress = await instance.groupChatAddress()
            assert.ok(chatAddress == group.address)

        } catch (error) {
            console.log(33333333, error)
        }

    })


    it("should join group success", async () => {
        const group = await GroupChatMock.deployed()

        for (let index = 0; index < accounts.length; index++) {
            const address = accounts[index];
            await group.joinGroup(0, address)
            await group.joinGroup(1, address)
            await group.joinGroup(2, address)

            if (index % 2 == 1) {
                await group.bannedGroup(1, address)
            }
        }
        const isJoin00 = await group.has(0, accounts[0])
        const isJoin01 = await group.has(0, accounts[1])
        const isJoin10 = await group.has(1, accounts[0])
        const isJoin11 = await group.has(1, accounts[1])
        const isJoin20 = await group.has(2, accounts[0])
        const isJoin21 = await group.has(2, accounts[1])

        const isJoin30 = await group.has(3, accounts[0])
        const isJoin31 = await group.has(3, accounts[1])

        const isBanned00 = await group.isBanned(0, accounts[0])
        const isBanned01 = await group.isBanned(0, accounts[1])
        const isBanned11 = await group.isBanned(1, accounts[1])

        assert.ok(isJoin00 && isJoin01 && isJoin10 && isJoin20 && isJoin11 && isJoin21)
        assert.ok(!isJoin30 && !isJoin31)

        assert.ok(!isBanned00 && !isBanned01)
        assert.ok(isBanned11)
    })

    it("should start group 3 game failed for" + accounts[0], async () => {
        try {
            const instance = await Game.deployed()
            const r = await instance.startGroupChatGame(card, web3.utils.toWei(new web3.utils.BN(5)), 3, 'no', { value: web3.utils.toWei(new web3.utils.BN(5)) })

        } catch (error) {
            assert.ok(error.toString().includes('You are not in this group'))
        }
    })

    it("should start group 1 game failed for" + accounts[1], async () => {
        try {
            const instance = await Game.deployed()
            const r = await instance.startGroupChatGame(card, web3.utils.toWei(new web3.utils.BN(5)), 1, 'no', { from: accounts[1], value: web3.utils.toWei(new web3.utils.BN(5)) })

        } catch (error) {
            assert.ok(error.toString().includes('You have been banned'))
        }
    })

    it("should start group 1 game success for" + accounts[0], async () => {

        const instance = await Game.deployed()
        const r = await instance.startGroupChatGame(card, web3.utils.toWei(new web3.utils.BN(5)), 1, 'yes', { value: web3.utils.toWei(new web3.utils.BN(5)) })

        truffleAssert.eventEmitted(r, 'CreateGroupHandGame', (ev) => {
            return ev[0] == 1 &&
                ev[1] == 0
        });
    })

    it("should join game failed for" + accounts[1], async () => {
        try {
            const instance = await Game.deployed()
            const r = await instance.joinGame(0, card2, { from: accounts[1], value: web3.utils.toWei(new web3.utils.BN(5)) })
        } catch (error) {
            assert.ok(error.toString().includes('You have been banned'))
        }

    })
    it("should join game success for" + accounts[1], async () => { 
        const instance = await Game.deployed()
        const r = await instance.joinGame(0, card2, { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == 0
        });
    })

    it("should start group 1 game success for" + accounts[0], async () => {
        const instance = await Game.deployed()
        const r = await instance.startGroupChatGame(card, web3.utils.toWei(new web3.utils.BN(5)), 1, 'yes', { value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'CreateGroupHandGame', (ev) => {
            return ev[0] == 1 &&
                ev[1] == 1
        });
    })
    it("should join game success for" + accounts[1], async () => {
        const instance = await Game.deployed()
        const r = await instance.joinGame(1, card2, { from: accounts[2], value: web3.utils.toWei(new web3.utils.BN(5)) })
        truffleAssert.eventEmitted(r, 'GameLocked', (ev) => {
            return ev[0] == 1
        });
    })

})

