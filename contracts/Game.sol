// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IGame.sol";
import "./interfaces/IPlayer.sol";
import "./interfaces/IStarter.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/ownership/Claimable.sol";

contract Game is IGame, IStarter, IPlayer, Claimable {
    uint256 public maxLimit = 1000 ether;
    uint256 public timeoutLimit = 10 minutes;
    uint256 public totalGameNumber = 0;

    struct GameCard {
        uint256 card;
        uint256 key;
        //1 Rock  2 Paper 3 Scissors  0 unknown
        uint8 content;
    }
    struct HandGame {
        uint256 gameId;
        uint256 amount;
        address starter;
        address player;
        //-1 cancel,0 started, 1 locked,2,finished
        int8 status;
        GameCard starterCard;
        GameCard playerCard;
        uint256 timeout;
    }

    HandGame[] public games;

    modifier onlyPlayer(uint256 gameId) {
        require(
            games[gameId].starter == msg.sender ||
                games[gameId].player == msg.sender,
            "need game owner"
        );
        _;
    }

    modifier onlyStarter(uint256 gameId) {
        require(games[gameId].starter == msg.sender, "need game owner");
        _;
    }

    modifier needGameStatus(uint256 gameId, int8 status) {
        require(games[gameId].status == status, "game status");
        _;
    }

    function setMaxLimit(uint256 limit) external onlyOwner {
        require(limit >= 1 ether);
        maxLimit = limit;
        emit SetMaxLimit(limit);
    }

    function setTimeoutLimit(uint256 limit) external onlyOwner {
        require(limit >= 1 ether);
        timeoutLimit = limit;
        emit SetTimeoutLimit(limit);
    }

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

    // private methods
    function _isTimeout(HandGame memory game) private view returns (bool) {
        return (game.timeout <= block.timestamp);
    }

    function _validateCard(
        uint256 card,
        uint256 key,
        uint8 content
    ) private view returns (bool) {
        return (card == uint256(keccak256(abi.encode(key, content))));
    }

    function _winOrLose(uint8 playerContent, uint8 otherContent)
        private
        view
        returns (int8)
    {
        int8 r = int8(playerContent - otherContent);
        if (r == 0) {
            return r;
        } else if (r == 1 || r == -2) {
            return 1;
        } else if (r == -1 || r == 2) {
            return -1;
        } else {
            return 0;
        }
    }
}
