// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IRPS {
    function mintRPS(address account, uint256 amount) external;

    /**
     * @dev Returns the amount of tokens owned by `account`.
     */
    function balanceOfRPS(address account) external view returns (uint256);
 

    function setMintContract() external;
}
