// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IRPS.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/ownership/Ownable.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/token/ERC20/ERC20.sol";

contract RPS is ERC20, Ownable, IRPS {
    constructor()
        public
        ERC20("RPS", "Rock paper scissors game score", 18, 0)
    {}

    function mintRPS(address account, uint256 amount) external onlyOwner {
        _mint(account, amount);
    }

    function balanceOfRPS(address account) public view returns (uint256) {
        return balanceOf(account);
    }

    function transferRPS(address recipient, uint256 amount)
        public
        onlyOwner
        returns (bool)
    {
        return transfer(recipient, amount);
    }
}
