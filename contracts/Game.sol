// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IGame.sol";
import "./interfaces/IPlayer.sol";
import "./interfaces/IStarter.sol";
import "./interfaces/IGroupChat.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/lifecycle/Enable.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/token/ERC20/ERC20.sol";

contract Game is IGame, IStarter, IPlayer, Enable, ERC20 {
    uint256 private maxLimit = 1000 ether;
    uint256 private timeoutLimit = 10 minutes;
    uint64 private totalGameNumber = 0;
    uint32 private viewCountLimit = 10;
    // uint32 public topPlayerLength = 3;
    // address[] public topPlayerList;

    address private groupChatAddress;
    IGroupChat private groupchatInstance;

    constructor()
        public
        ERC20("RPS", "Rock paper scissors game score", 18, 0)
    {}

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

    HandGame[] private games;
    mapping(uint64 => uint256) internal gameToGroup;

    modifier onlyActivatedGroupMember(uint256 group_id) {
        require(groupChatAddress != address(0x0), "No group chat address");
        require(
            groupchatInstance.has(group_id, msg.sender),
            "You are not in this group"
        );
        require(
            !groupchatInstance.isBanned(group_id, msg.sender),
            "You have been banned"
        );
        _;
    }
    modifier onlyPlayer(uint64 gameId) {
        require(
            games[gameId].starter == msg.sender ||
                games[gameId].player == msg.sender,
            "need game player"
        );
        _;
    }

    modifier onlyTimeout(uint64 gameId) {
        require(_isTimeout(gameId), "need game time out");
        _;
    }

    modifier notTimeout(uint64 gameId) {
        require(!_isTimeout(gameId), "time is out");
        _;
    }

    // modifier onlyGameStarted(uint64 gameId) {
    //     require(gameId < totalGameNumber, "wrong game id");
    //     _;
    // }

    modifier needGameStatus(uint64 gameId, uint8 status) {
        require(gameId < totalGameNumber, "wrong game id");
        require(games[gameId].status == status, "wrong game status");
        _;
    }

    // contract owner methods

    function setGroupChat(address groupchat) public onlyOwner {
        groupChatAddress = groupchat;
        groupchatInstance = IGroupChat(groupchat);
    }

    function setMaxLimit(uint256 limit) external onlyOwner {
        require(limit >= 1 ether, "limit to low");
        maxLimit = limit;
        emit SetMaxLimit(limit);
    }

    function setTimeoutLimit(uint256 limit) external onlyOwner {
        timeoutLimit = limit;
        emit SetTimeoutLimit(limit);
    }

    // function viewTopPlayers() external view returns (address[]) {
    //     return topPlayerList;
    // }

    // view
    function viewGame(uint64 gameId)
        external
        view
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
        require(gameId < totalGameNumber, "wrong game id");
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
        _createGame(card, threshold);
    }

    function startGroupChatGame(
        uint256 card,
        uint256 threshold,
        uint256 group_id,
        string userMessage
    ) external payable onlyEnabled {
        uint64 gameId = _createGame(card, threshold);
        gameToGroup[gameId] = group_id;
        _notifyGroup(group_id, gameId);
        emit CreateGroupHandGame(
            group_id,
            gameId,
            msg.sender,
            userMessage,
            msg.value,
            threshold
        );
    }

    function cancelGame(uint64 gameId)
        external
        onlyPlayer(gameId)
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
        needGameStatus(gameId, 0)
        notTimeout(gameId)
    {
        uint256 group_id = gameToGroup[gameId];
        if (group_id > 0) {
            _lockGroupGame(gameId, card, group_id);
        } else {
            _lockGame(gameId, card);
        }
    }

    function openCard(
        uint64 gameId,
        string key,
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
        require(validate, "wrong key or content");
        card.key = key;
        card.content = content;

        emit CardOpened(gameId, msg.sender, key, content);

        if (game.starterCard.content != 0 && game.playerCard.content != 0) {
            int8 r = _winOrLose(
                game.starterCard.content,
                game.playerCard.content
            );
            _finishGame(gameId, r);
        }
    }

    function finishTimeoutGame(uint64 gameId)
        external
        onlyPlayer(gameId)
        needGameStatus(gameId, 1)
        onlyTimeout(gameId)
    {
        HandGame memory game = games[gameId];
        GameCard memory starter = game.starterCard;
        GameCard memory player = game.playerCard;
        if (starter.content != 0) {
            _finishGame(gameId, 1);
        } else if (player.content != 0) {
            _finishGame(gameId, -1);
        } else {
            _finishGame(gameId, 0);
        }
    }

    // private methods

    function _notifyGroup(uint256 group_id, uint64 gameId)
        internal
        onlyActivatedGroupMember(group_id)
    {
        string memory message = _getMessageWithSeq(gameId);
        groupchatInstance.sendMessage(group_id, message);
    }

    function _getMessageWithSeq(uint256 seq) private pure returns (string) {
        string memory _id = uintToString(seq);
        string memory msg0 = '{"message":{"seq":';
        string memory msg1 = '},"type":"hanggame","version":"1"}';
        string memory message = strConcat(msg0, _id);
        message = strConcat(message, msg1);
        return message;
    }

    function _lockGroupGame(
        uint64 gameId,
        uint256 card,
        uint256 group_id
    ) private onlyActivatedGroupMember(group_id) {
        _lockGame(gameId, card);
    }

    function _lockGame(uint64 gameId, uint256 card) private {
        HandGame storage game = games[gameId];
        GameCard memory playerCard = GameCard(card, "", 0);
        require(msg.value >= game.threshold, "wrong balance");
        // 退款
        if (msg.value > game.threshold) {
            msg.sender.transfer(msg.value - game.threshold);
        }
        game.player = msg.sender;
        game.playerCard = playerCard;
        game.amount = game.amount + game.threshold;
        game.timeout = timeoutLimit + block.timestamp;
        game.status = 1;
        _mintAndSort(game.starter, 2);
        _mintAndSort(game.player, 1);
        emit GameLocked(gameId, msg.sender, card, game.threshold);
    }

    function _createGame(uint256 card, uint256 threshold)
        private
        returns (uint64)
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
        return game.gameId;
    }

    function _mintAndSort(address account, uint256 amount) private {
        // uint256 preLastInListBalance = 0;
        // if (topPlayerList.length >= topPlayerLength) {
        //     preLastInListBalance = balanceOf(
        //         topPlayerList[topPlayerList.length - 1]
        //     );
        // }

        _mint(account, amount);
        // int32 indexOf = _indexOfTopPlayerList(account);

        // // list more than topPlayerLength
        // if (topPlayerList.length >= topPlayerLength) {
        //     // add new account to top list
        //     if (balanceOf(account) > preLastInListBalance) {
        //         if (indexOf < 0) {
        //             topPlayerList[topPlayerList.length - 1] = account;
        //             indexOf = int32(topPlayerList.length - 1);
        //         }
        //         _resortPlayerList(account, indexOf);
        //     }
        // } else {
        //     // if account is not in top list,push and resort
        //     if (indexOf < 0) {
        //         topPlayerList.push(account);
        //         indexOf = int32(topPlayerList.length - 1);
        //     }
        //     _resortPlayerList(account, indexOf);
        // }
    }

    function strConcat(string _a, string _b) internal pure returns (string) {
        bytes memory a = bytes(_a);
        bytes memory b = bytes(_b);
        string memory ab = new string(a.length + b.length);
        bytes memory aAB = bytes(ab);
        uint256 k = 0;
        for (uint256 i = 0; i < a.length; i++) aAB[k++] = a[i];
        for (i = 0; i < b.length; i++) aAB[k++] = b[i];
        return string(aAB);
    }

    function uintToString(uint256 i) internal pure returns (string) {
        if (i == 0) return "0";
        uint256 j = i;
        uint256 length;
        while (j != 0) {
            length++;
            j /= 10;
        }
        bytes memory bstr = new bytes(length);
        uint256 k = length - 1;
        while (i != 0) {
            bstr[k--] = bytes1(48 + (i % 10));
            i /= 10;
        }
        return string(bstr);
    }

    // function _indexOfTopPlayerList(address account) internal returns (int32) {
    //     int32 indexOf = -1;
    //     for (uint256 i = 0; i < topPlayerList.length; i++) {
    //         if (account == topPlayerList[i]) {
    //             indexOf = int32(i);
    //             break;
    //         }
    //     }
    //     return indexOf;
    // }

    /**resort top list,need new player in tip list
     */
    // function _resortPlayerList(address account, int32 end) internal {
    //     if (topPlayerList.length > 1) {
    //         uint256 newBalance = balanceOf(account);
    //         uint256 newIndex = uint256(end);
    //         // find new location for account
    //         for (uint256 i = 0; i < newIndex; i++) {
    //             if (newBalance > balanceOf(topPlayerList[i])) {
    //                 newIndex = i;
    //                 break;
    //             }
    //         }

    //         // if need to change the list
    //         if (newIndex < uint256(end)) {
    //             // change data after new location
    //             for (uint256 j = uint256(end); j > newIndex; j--) {
    //                 topPlayerList[j] = topPlayerList[j - 1];
    //             }
    //             topPlayerList[newIndex] = account;
    //         }
    //     }
    // }

    function _finishGame(uint64 gameId, int8 r) private {
        HandGame storage game = games[gameId];
        if (r == 1) {
            game.starter.transfer(game.amount);
            _mintAndSort(game.starter, 3);
        } else if (r == -1) {
            game.player.transfer(game.amount);
            _mintAndSort(game.player, 3);
        } else {
            game.starter.transfer(game.amount / 2);
            game.player.transfer(game.amount / 2);
            _mintAndSort(game.starter, 1);
            _mintAndSort(game.player, 1);
        }
        game.status = 2;
        emit GameFinished(gameId, r);
    }

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
