// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IGame {
    event SetMaxLimit(uint256 limit);
    event SetTimeoutLimit(uint256 limit);
    /**
     * Game started by starter,
     */
    event GameStarted(
        uint64 indexed gameId,
        address starter,
        uint256 card,
        uint256 amount,
        uint256 threshold
    );
    /**
     * No other player join the game, starter cancel the game
     */
    event GameCancelled(uint64 indexed gameId);
    /**
     * Player joined, the game will be locked
     */
    event GameLocked(
        uint64 indexed gameId,
        address player,
        uint256 card,
        uint256 amount
    );

    event CardOpened(
        uint64 indexed gameId,
        address player,
        string key,
        uint8 content
    );

    event GameFinished(uint64 indexed gameId, int8 result);

    function setMaxLimit(uint256 limit) external;

    function setTimeoutLimit(uint256 limit) external;
}
