// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./Player.sol";
import "./interfaces/IStarter.sol";

contract Starter is Player, IStarter {
    function startGame(uint256 card) external payable {
        GameCard memory starter = GameCard(card, 0, 0);
        GameCard memory player = GameCard(0, 0, 0);
        HandGame memory game = HandGame(
            totalGameNumber,
            msg.value,
            msg.sender,
            address(0),
            0,
            starter,
            player,
            block.timestamp + timeoutLimit
        );
        totalGameNumber++;
        games.push(game);
        emit GameStarted(game.gameId, game.starter, card, msg.value);
    }

    function cancelGame(uint256 gameId)
        external
        onlyStarter(gameId)
        needGameStatus(gameId, 0)
    {
        HandGame storage game = games[gameId];
        game.status = -1;
        msg.sender.transfer(game.amount);
        emit GameCancelled(gameId);
    }
}
