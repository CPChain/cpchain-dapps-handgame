// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IGame.sol";
import "@cpchain-tools/cpchain-dapps-utils/contracts/ownership/Claimable.sol";

contract Game is IGame, Claimable {
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
        //0 started, -1 cancel,1 locked,2,finished
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

    function _isTimeout(HandGame memory game) internal view returns (bool) {
        return (game.timeout <= block.timestamp);
    }

    function _validateCard(
        uint256 card,
        uint256 key,
        uint8 content
    ) internal view returns (bool) {
        // keccak256(0xff42242448656c6c6f2c20776f726c6421);
        return (card == uint256(keccak256(abi.encode(key, content))));
    }

    function _winOrLose(uint8 playerContent, uint8 otherContent)
        internal
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
