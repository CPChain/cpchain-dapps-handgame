// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0; 

interface IGame   {
    event SetMaxLimit(uint256 limit);
    event SetTimeoutLimit(uint256 limit);
    /**
     * Game started by starter,
     */
    event GameStarted(
        uint256 gameId,
        address starter,
        uint256 card,
        uint256 amount
    );
    /**
     * No other player join the game, starter cancel the game
     */
    event GameCancelled(uint256 gameId);
    /**
     * Player joined, the game will be locked
     */
    event GameLocked(uint256 gameId, address player, uint256 card);

    event GameFinished(uint256 gameId, address winner);

 
    function setMaxLimit(uint256 limit) external;
    function setTimeoutLimit(uint256 limit) external;

}
