// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IGame.sol";
import "./interfaces/IPlayer.sol";
import "./interfaces/IStarter.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/lifecycle/Enable.sol";

contract Game is IGame, IStarter, IPlayer, Enable {
    uint256 public maxLimit = 1000 ether;
    uint256 public timeoutLimit = 10 minutes;
    uint64 public totalGameNumber = 0;
    uint32 public viewCountLimit = 10;

    struct GameCard {
        uint256 card;
        string key;
        //1 Rock  2 Paper 3 Scissors  0 unknown
        uint8 content;
    }
    struct HandGame {
        uint64 gameId;
        uint256 amount;
        address starter;
        address player;
        //0 started, 1 locked,2,finished,3 cancel,
        uint8 status;
        GameCard starterCard;
        GameCard playerCard;
        uint256 timeout;
        uint256 threshold;
    }

    HandGame[] public games;

    modifier onlyPlayer(uint64 gameId) {
        require(
            games[gameId].starter == msg.sender ||
                games[gameId].player == msg.sender,
            "need game player"
        );
        _;
    }

    modifier onlyStarter(uint64 gameId) {
        require(games[gameId].starter == msg.sender, "need game starter");
        _;
    }

    modifier onlyTimeout(uint64 gameId) {
        require(_isTimeout(gameId), "need game time out");
        _;
    }

    modifier onlyGameStarted(uint64 gameId) {
        require(gameId < totalGameNumber, "wrong game id");
        _;
    }

    modifier needGameStatus(uint64 gameId, uint8 status) {
        require(games[gameId].status == status, "wrong game status");
        _;
    }

    modifier needCurrentContent(uint8 content) {
        require(content < 4 && content > 0, "wrong content");
        _;
    }

    // contract owner methods
    function setMaxLimit(uint256 limit) external onlyOwner {
        require(limit >= 1 ether, "limit to low");
        maxLimit = limit;
        emit SetMaxLimit(limit);
    }

    function setTimeoutLimit(uint256 limit) external onlyOwner {
        timeoutLimit = limit;
        emit SetTimeoutLimit(limit);
    }

    // view
    function viewGame(uint64 gameId)
        external
        view
        onlyGameStarted(gameId)
        returns (
            uint256,
            uint256,
            address,
            address,
            uint8,
            uint256,
            uint256,
            string,
            uint8,
            uint256,
            string,
            uint8
        )
    {
        HandGame memory game = games[gameId];
        return (
            game.amount,
            game.threshold,
            game.starter,
            game.player,
            game.status,
            game.timeout,
            game.starterCard.card,
            game.starterCard.key,
            game.starterCard.content,
            game.playerCard.card,
            game.playerCard.key,
            game.playerCard.content
        );
    }

    /**
     * view the lastest
     */
    function viewLatestGames(uint64 limit) external view returns (uint256[]) {
        require(limit <= viewCountLimit, "limit is too high");
        uint64 count = limit > totalGameNumber ? totalGameNumber : limit;
        uint256[] memory _lastestGames = new uint256[](count * 7);
        for (uint64 i = 0; i < count; i++) {
            HandGame memory game = games[totalGameNumber - i - 1];
            _lastestGames[i * 7 + 0] = uint256(game.gameId);
            _lastestGames[i * 7 + 1] = game.amount;
            _lastestGames[i * 7 + 2] = game.threshold;
            _lastestGames[i * 7 + 3] = uint256(game.starter);
            _lastestGames[i * 7 + 4] = uint256(game.player);
            _lastestGames[i * 7 + 5] = uint256(game.status);
            _lastestGames[i * 7 + 6] = game.timeout;
        }

        return (_lastestGames);
    }

    // game starter methods
    function startGame(uint256 card, uint256 threshold)
        external
        payable
        onlyEnabled
    {
        GameCard memory starter = GameCard(card, "", 0);
        GameCard memory player = GameCard(0, "", 0);
        HandGame memory game = HandGame(
            totalGameNumber,
            msg.value,
            msg.sender,
            address(0),
            0,
            starter,
            player,
            block.timestamp + timeoutLimit,
            threshold
        );
        totalGameNumber++;
        games.push(game);
        emit GameStarted(game.gameId, game.starter, card, msg.value, threshold);
    }

    function cancelGame(uint64 gameId)
        external
        onlyGameStarted(gameId)
        onlyStarter(gameId)
        needGameStatus(gameId, 0)
        onlyTimeout(gameId)
    {
        HandGame storage game = games[gameId];
        game.status = 3;
        msg.sender.transfer(game.amount);
        emit GameCancelled(gameId);
    }

    // player methods
    function joinGame(uint64 gameId, uint256 card)
        external
        payable
        onlyGameStarted(gameId)
        needGameStatus(gameId, 0)
    {
        HandGame storage game = games[gameId];
        uint256 joinedAmount;

        GameCard memory playerCard = GameCard(card, "", 0);
        require(msg.value >= game.threshold, "wrong balance");
        // 退款
        if (msg.value > game.amount) {
            msg.sender.transfer(msg.value - game.amount);
            joinedAmount = game.amount;
        } else {
            joinedAmount = msg.value;
        }

        game.player = msg.sender;
        game.playerCard = playerCard;
        game.amount = game.amount * 2;
        game.timeout = timeoutLimit + block.timestamp;
        game.status = 1;
        emit GameLocked(gameId, msg.sender, card, joinedAmount);
    }

    function openCard(
        uint64 gameId,
        string key,
        uint8 content
    )
        external
        onlyGameStarted(gameId)
        onlyPlayer(gameId)
        needGameStatus(gameId, 1)
        needCurrentContent(content)
    {
        HandGame storage game = games[gameId];
        GameCard storage card;
        if (game.starter == msg.sender) {
            card = game.starterCard;
        } else {
            card = game.playerCard;
        }
        bool validate = _validateCard(card.card, key, content);
        require(validate, "wrong key or content");
        card.key = key;
        card.content = content;

        emit CardOpened(gameId, msg.sender, key, content);

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
            game.status = 2;
            emit GameFinished(gameId, r);
        }
    }

    function finishGame(uint64 gameId)
        external
        onlyGameStarted(gameId)
        onlyPlayer(gameId)
        needGameStatus(gameId, 1)
        onlyTimeout(gameId)
    {
        HandGame storage game = games[gameId];
        GameCard memory starter = game.starterCard;
        GameCard memory player = game.playerCard;
        if (starter.content != 0) {
            game.starter.transfer(game.amount);
            emit GameFinished(gameId, 1);
        } else if (player.content != 0) {
            game.player.transfer(game.amount);
            emit GameFinished(gameId, -1);
        } else {
            game.starter.transfer(game.amount / 2);
            game.player.transfer(game.amount / 2);
            emit GameFinished(gameId, 0);
        }
        game.status = 2;
    }

    // private methods
    function _isTimeout(uint64 gameId) private view returns (bool) {
        HandGame memory game = games[gameId];
        return (game.timeout <= block.timestamp);
    }

    function _validateCard(
        uint256 card,
        string key,
        uint8 content
    ) private view returns (bool) {
        return (card == uint256(keccak256(abi.encodePacked(key, content))));
    }

    function _winOrLose(uint8 playerContent, uint8 otherContent)
        private
        view
        returns (int8)
    {
        int8 r = int8(playerContent - otherContent);
        if (r == 1 || r == -2) {
            return 1;
        } else if (r == -1 || r == 2) {
            return -1;
        } else {
            return 0;
        }
    }
}
