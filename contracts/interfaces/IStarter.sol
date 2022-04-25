// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IStarter {
    function startGame(uint256 card, uint256 threshold) external payable;

    function startGroupChatGame(
        uint256 card,
        uint256 threshold,
        uint256 group_id,
        string message
    ) external payable;

    function cancelGame(uint64 gameId) external;
}
