// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;
import "./interfaces/ICard.sol";

/**
 * @dev Implementation of the `ICard` interface.
 *
 * We realize the card playing and verification through keccak256.
 * Through this contract, users can submit unknown but verifiable privacy information.
 *
 * Each card has the following two states
 * 1. Unknown: there is only the hash information of the card on the chain.
 *    The user needs to submit proof and privacy content and pass keccak256 authentication to change its status
 * 2. Verified: all information of the card can be obtained at this time
 *
 * Note that the user's privacy information cannot be set to 0
 */
contract Card is ICard {
    mapping(uint256 => uint256[2]) cards;

    /**
     * @dev Open the card with proof and content
     */
    function validateCard(
        uint256 card,
        uint256 proof,
        uint256 content
    ) external {
        bool validate = _validateProof(card, proof, content);
        require(validate, "wrong proof or content");
        cards[card] = [proof, content];
        emit CardOpened(card, proof, content);
    }

    /**
     * @dev get the card from contract
     *
     * Returns the proof and conttent.
     *
     * Note if the card is not opened,returns should be zero
     */
    function viewCard(uint256 card) external view returns (uint256, uint256) {
        return (cards[card][0], cards[card][1]);
    }

    function _validateProof(
        uint256 card,
        uint256 proof,
        uint256 content
    ) private pure returns (bool) {
        return (card == uint256(keccak256(abi.encodePacked(proof, content))));
    }

    function validate2() public pure returns (string) {
        uint256 a = 1111;
        return string(abi.encodePacked("aaa", string(a)  , "bbb"));
    }
}
