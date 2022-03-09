// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./Game.sol";
import "./interfaces/IPlayer.sol";

contract Player is Game, IPlayer {
    function joinGame(uint256 gameId, uint256 card)
        external
        payable
        needGameStatus(gameId, 0)
    {
        HandGame storage game = games[gameId];

        GameCard memory playerCard = GameCard(card, 0, 0);
        require(msg.value >= game.amount);
        // 退款
        if (msg.value >= game.amount) {
            msg.sender.transfer(msg.value - game.amount);
        }

        game.player = msg.sender;
        game.playerCard = playerCard;
        game.amount = game.amount * 2;
        game.timeout = timeoutLimit + block.timestamp;
        emit GameLocked(gameId, msg.sender, card);
    }

    function openCard(
        uint256 gameId,
        uint256 key,
        uint8 content
    ) external onlyPlayer(gameId) needGameStatus(gameId, 1) {
        HandGame storage game = games[gameId];
        GameCard storage card;
        if (game.starter == msg.sender) {
            card = game.starterCard;
        } else {
            card = game.playerCard;
        }

        bool validate = _validateCard(card.card, key, content);
        require(validate, "wrong key and content");
        card.key = key;
        card.content = content;

        if (game.starterCard.content != 0 && game.playerCard.content != 0) {
            int8 r = _winOrLose(
                game.starterCard.content,
                game.playerCard.content
            );
            if (r == 1) {
                game.starter.transfer(game.amount);
            } else if (r == -1) {
                game.player.transfer(game.amount);
            } else {
                game.starter.transfer(game.amount / 2);
                game.player.transfer(game.amount / 2);
            }
        }
    }

    function timeoutGame(uint256 gameId)
        external
        onlyPlayer(gameId)
        needGameStatus(gameId, 1)
    {
        HandGame memory game = games[gameId];
        if (_isTimeout(game)) {
            GameCard memory starter = game.starterCard;
            GameCard memory player = game.playerCard;
            if (starter.content != 0) {
                game.starter.transfer(game.amount);
            } else if (player.content != 0) {
                game.player.transfer(game.amount);
            } else {
                game.starter.transfer(game.amount / 2);
                game.player.transfer(game.amount / 2);
            }
        }
    }
}
