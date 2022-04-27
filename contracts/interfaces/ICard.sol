// SPDX-License-Identifier: MIT
pragma solidity >=0.4.22 <0.9.0;

interface ICard {
    /**
     * @dev Emitted when `card` been proved by `proof` and `content`
     */
    event CardOpened(
        uint256 indexed card,
        uint256 indexed proof,
        uint256 indexed content
    );

    /**
     * @dev Open the card with proof and content
     */
    function validateCard(
        uint256 card,
        uint256 proof,
        uint256 content
    ) external;

    /**
     * @dev get the card from contract
     *
     * Returns the proof and conttent.
     *
     * Note if the card is not opened,returns should be zero
     */
    function viewCard(uint256 card) external view returns (uint256, uint256);
}
