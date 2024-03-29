// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IGame.sol";
import "./interfaces/IPlayer.sol";
import "./interfaces/IStarter.sol";
import "./interfaces/IGroupChat.sol";
import "./interfaces/IRPS.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/lifecycle/Enable.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/security/Verifiable.sol";

//1 Rock  2 Paper 3 Scissors  0 unknown

contract Game is IGame, IStarter, IPlayer, Enable, Verifiable {
    uint256 public maxLimit = 1000 ether;
    uint256 public timeoutLimit = 24 hours;
    uint64 public totalGameNumber = 0;
    address public groupChatAddress;
    address public rpsAddress;
    IGroupChat private groupchatInstance;
    IRPS private RPSInstance;
    struct MintConfig {
        uint256 createrMint;
        uint256 staterLockMint;
        uint256 playerLockMint;
        uint256 winnerMint;
        uint256 loserMint;
        uint256 drawMint;
    }
    struct HandGame {
        uint64 gameId;
        uint256 amount;
        address starter;
        address player;
        //0 started, 1 locked,2,finished,3 cancel,
        uint8 status;
        uint256 starterProof;
        uint256 playerProof;
        uint256 timeout;
        uint256 threshold;
    }

    constructor(address rps) public {
        mintConfig = MintConfig(1 ether,1 ether, 1 ether, 3 ether, 0 ether, 1 ether);
        rpsAddress = rps;
        RPSInstance = IRPS(rps);
    }

    MintConfig public mintConfig;
    HandGame[] public games;
    mapping(uint64 => uint256) public gameToGroup;

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

    modifier needGameStatus(uint64 gameId, uint8 status) {
        require(gameId < totalGameNumber, "wrong game id");
        require(games[gameId].status == status, "wrong game status");
        _;
    }

    // contract owner methods
    function setMintConfig(
        uint256 starterMint,
        uint256 staterLockMint,
        uint256 playerLockMint,
        uint256 winnerMint,
        uint256 loserMint,
        uint256 drawMint
    ) public onlyOwner {
        mintConfig = MintConfig(
            starterMint,
            staterLockMint,
            playerLockMint,
            winnerMint,
            loserMint,
            drawMint
        );
        emit SetMintConfig(starterMint,staterLockMint,playerLockMint,winnerMint,loserMint,drawMint);
    }

    function setGroupChat(address groupchat) public onlyOwner {
        groupChatAddress = groupchat;
        groupchatInstance = IGroupChat(groupchat);
    }

    function setRPS(address rps) public onlyOwner {
        rpsAddress = rps;
        RPSInstance = IRPS(rps);
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
            uint256[]
        )
    {
        require(gameId < totalGameNumber, "wrong game id");
        HandGame memory game = games[gameId];
        (uint256 starterKey, uint256 starterContent) = viewContent(
            game.starterProof
        );
        (uint256 playerKey, uint256 playerContent) = viewContent(
            game.playerProof
        );

        uint256[] memory cardsInfo = new uint256[](6);
        cardsInfo[0] = game.starterProof;
        cardsInfo[1] = starterKey;
        cardsInfo[2] = starterContent;
        cardsInfo[3] = game.playerProof;
        cardsInfo[4] = playerKey;
        cardsInfo[5] = playerContent;
        return (
            game.amount,
            game.threshold,
            game.starter,
            game.player,
            game.status,
            game.timeout,
            cardsInfo
        );
    }

    function startGame(uint256 proof, uint256 threshold)
        external
        payable
        onlyEnabled
    {

        _createGame(proof, threshold);
    }

    function startGroupChatGame(
        uint256 proof,
        uint256 threshold,
        uint256 group_id,
        string userMessage
    ) external payable onlyActivatedGroupMember(group_id) onlyEnabled {
        uint64 gameId = _createGame(proof, threshold);
        gameToGroup[gameId] = group_id;
        _notifyGroup(group_id, gameId, userMessage);
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
    function joinGame(uint64 gameId, uint256 proof)
        external
        payable
        needGameStatus(gameId, 0)
        notTimeout(gameId)
    {
        uint256 group_id = gameToGroup[gameId];
        if (group_id > 0) {
            _lockGroupGame(gameId, proof, group_id);
        } else {
            _lockGame(gameId, proof);
        }
    }

    function openCard(
        uint64 gameId,
        uint256 key,
        uint256 content
    ) external onlyPlayer(gameId) needGameStatus(gameId, 1) {
        HandGame storage game = games[gameId];
        uint256 proof;
        if (game.starter == msg.sender) {
            proof = game.starterProof;
        } else {
            proof = game.playerProof;
        }
        bool validate = validateProof(proof, key, content);
        require(validate, "wrong key or content");
        setProof(proof, key, content);
        emit CardOpened(gameId, msg.sender, key, content);

        (, uint256 starterContent) = viewContent(game.starterProof);
        (, uint256 playerContent) = viewContent(game.playerProof);
        if (starterContent != 0 && playerContent != 0) {
            int8 r = _winOrLose(starterContent, playerContent);
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
        (, uint256 starterContent) = viewContent(game.starterProof);
        (, uint256 playerContent) = viewContent(game.playerProof);
        if (starterContent != 0) {
            _finishGame(gameId, 1);
        } else if (playerContent != 0) {
            _finishGame(gameId, -1);
        } else {
            _finishGame(gameId, 0);
        }
    }

    function _notifyGroup(
        uint256 group_id,
        uint64 gameId,
        string userMessage
    ) internal onlyActivatedGroupMember(group_id) {
        string memory message = _getMessage(gameId, userMessage, msg.sender);
        groupchatInstance.sendMessage(group_id, message);
    }

    function _getMessage(
        uint256 seq,
        string userMessage,
        address sender
    ) private pure returns (string) {
        string memory _id = uintToString(seq);
        string memory msg0 = '{"message":{"seq":';
        string memory msgUser = ',"msg":"';
        string memory msgSender = '","sender":"';
        string memory msg1 = '"},"type":"hang-game","version":"2.1"}';
        string memory message = string(
            abi.encodePacked(
                msg0,
                _id,
                msgUser,
                userMessage,
                msgSender,
                _toAsciiString(sender),
                msg1
            )
        );
        return message;
    }

    function _lockGroupGame(
        uint64 gameId,
        uint256 proof,
        uint256 group_id
    ) private onlyActivatedGroupMember(group_id) {
        _lockGame(gameId, proof);
    }

    function _lockGame(uint64 gameId, uint256 proof) private {
        HandGame storage game = games[gameId];
        require(msg.value >= game.threshold, "wrong balance");
        game.player = msg.sender;
        game.playerProof = proof;
        game.amount = game.amount + msg.value;
        game.timeout = timeoutLimit + block.timestamp;
        game.status = 1;
        _mintRPS(game.starter, mintConfig.staterLockMint);
        _mintRPS(game.player, mintConfig.playerLockMint);
        emit GameLocked(gameId, msg.sender, proof, msg.value);
    }

    function _createGame(uint256 proof, uint256 threshold)
        private
        returns (uint64)
    {
        require(msg.value <= maxLimit, "Amount is too large");
        HandGame memory game = HandGame(
            totalGameNumber,
            msg.value,
            msg.sender,
            address(0),
            0,
            proof,
            0,
            block.timestamp + timeoutLimit,
            threshold
        );
        totalGameNumber++;
        games.push(game);
        _mintRPS(msg.sender, mintConfig.createrMint);
        emit GameStarted(
            game.gameId,
            game.starter,
            proof,
            msg.value,
            threshold
        );
        return game.gameId;
    }

    function _mintRPS(address account, uint256 amount) private {
        if(rpsAddress != address(0)){
            RPSInstance.mintRPS(account, amount);
        }
    }

    function _toAsciiString(address x) internal pure returns (string memory) {
        bytes memory s = new bytes(40);
        for (uint256 i = 0; i < 20; i++) {
            bytes1 b = bytes1(uint8(uint256(uint160(x)) / (2**(8 * (19 - i)))));
            bytes1 hi = bytes1(uint8(b) / 16);
            bytes1 lo = bytes1(uint8(b) - 16 * uint8(hi));
            s[2 * i] = _char(hi);
            s[2 * i + 1] = _char(lo);
        }
        return string(s);
    }

    function _char(bytes1 b) internal pure returns (bytes1 c) {
        if (uint8(b) < 10) return bytes1(uint8(b) + 0x30);
        else return bytes1(uint8(b) + 0x57);
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

    function _finishGame(uint64 gameId, int8 r) private {
        HandGame storage game = games[gameId];
        if (r == 1) {
            game.starter.transfer(game.amount);
            _mintRPS(game.starter, mintConfig.winnerMint);
            _mintRPS(game.player, mintConfig.loserMint);
        } else if (r == -1) {
            game.player.transfer(game.amount);
            _mintRPS(game.player, mintConfig.winnerMint);
            _mintRPS(game.starter, mintConfig.loserMint);
        } else {
            game.starter.transfer(game.amount / 2);
            game.player.transfer(game.amount / 2);
            _mintRPS(game.player, mintConfig.drawMint);
            _mintRPS(game.starter, mintConfig.drawMint);
        }
        game.status = 2;
        emit GameFinished(gameId, r);
    }

    function _isTimeout(uint64 gameId) private view returns (bool) {
        HandGame memory game = games[gameId];
        return (game.timeout <= block.timestamp);
    }

    function _winOrLose(uint256 playerContent, uint256 otherContent)
        private
        pure
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
