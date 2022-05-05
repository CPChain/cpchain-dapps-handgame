// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface IGroupChat {
    /**
     * Send Message to a chat
     * The formation of message need to reference: https://github.com/CPChain/cpchain-dapps-message#methods
     * Emits a {SendMessage} event
     */
    event TestSendMessage(uint256 id, string message);

    function sendMessage(uint256 id, string   message) external;

    /**
     * Check a member whether is banned
     */
    function isBanned(uint256 id, address member) external view returns (bool);

    /**
     * Check a group if has this member
     */
    function has(uint256 id, address member) external view returns (bool);
}
