// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IPlayer {
    function joinGame(uint256 gameId, uint256 card) external payable;

    function openCard(uint256 gameId,uint256 key, uint8 content) external;

    function timeoutGame(uint256 gameId) external;
}
