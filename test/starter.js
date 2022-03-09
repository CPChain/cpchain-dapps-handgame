const Starter = artifacts.require("Starter"); 
contract("Test Starter ", (accounts) => {
    it("should register success for " + accounts[0], async () => {
        const instance = await Starter.deployed()
        const maxLimit = await instance.maxLimit () 
        console.log(maxLimit) 
    })
 
})
