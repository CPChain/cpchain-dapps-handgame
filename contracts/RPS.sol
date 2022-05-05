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
    modifier onlyMintAddress() {
        require(msg.sender == _mintAddress, "Ownable: caller is not the owner");
        _;
    }
    function mintRPS(address account, uint256 amount) external onlyMintAddress {
        _mint(account, amount);
    }

    function balanceOfRPS(address account) public view returns (uint256) {
        return balanceOf(account);
    }

    function transferRPS(address recipient, uint256 amount)
        public
        onlyMintAddress
        returns (bool)
    {
        return transfer(recipient, amount);
    }

    function setMintContract() external {
        require(owner == tx.origin, "need origin is owner");
        _mintAddress = msg.sender;
    }
}
