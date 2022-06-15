// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IRPS.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/ownership/Ownable.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/token/ERC20/ERC20.sol";

contract RPS is ERC20, Ownable, IRPS {
    address private _mintAddress;
    constructor()
        public
        ERC20("RPS", "Rock paper scissors game score", 18, 0)
    {}

    modifier onlyMinter() {
        require(msg.sender == _mintAddress, "Ownable: caller is not the minter");
        _;
    }

    function mintRPS(address account, uint256 amount) external onlyMinter {
        _mint(account, amount);
    }

    function setMintContract(address contractAddress) external onlyOwner {
        _mintAddress = contractAddress;
    }
}
