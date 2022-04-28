// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IRPS {
    function mintRPS(address account, uint256 amount) external;

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOfRPS(address account) external view returns (uint256);

    /**
     * @dev Moves `amount` tokens from the caller's account to `to`.
     *
     * Returns a boolean value indicating whether the operation succeeded.
     *
     * Emits a {Transfer} event.
     */
    function transferRPS(address to, uint256 amount) external returns (bool);

    function setMintContract() external;
}
