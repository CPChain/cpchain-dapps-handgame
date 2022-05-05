// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/IGroupChat.sol";

contract GroupChatMock is IGroupChat {
  

    mapping(uint256 => mapping(address => bool)) public groupMembers;

    mapping(uint256 => mapping(address => bool)) public bannedMembers;

    function joinGroup(uint256 id, address member) external {
        groupMembers[id][member] = true;
    }

    function bannedGroup(uint256 id, address member) external {
        bannedMembers[id][member] = true;
    }

    function sendMessage(uint256 id, string   message) external {
        emit TestSendMessage(id, message);
    }

    /**
     * Check a member whether is banned
     */
    function isBanned(uint256 id, address member) external view returns (bool) {
        return bannedMembers[id][member];
    }

    /**
     * Check a group if has this member
     */
    function has(uint256 id, address member) external view returns (bool) {
        return groupMembers[id][member];
    }
}
