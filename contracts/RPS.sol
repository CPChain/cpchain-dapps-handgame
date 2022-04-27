// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "@cpchain-tools/cpchain-dapps-utils/contracts/ownership/Ownable.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/token/ERC20/ERC20.sol";

contract RPS is ERC20, Ownable {
    constructor()
        public
        ERC20("RPS", "Rock paper scissors game score", 18, 0)
    {}

    function _mint(address account, uint256 amount) internal onlyOwner {
        require(account != address(0), "ERC20: mint to the zero address");

        _totalSupply = _totalSupply.add(amount);
        _balances[account] = _balances[account].add(amount);
        emit Transfer(address(0), account, amount);
    }
}
