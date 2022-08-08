# cpchain-dapps-handgame

## Abstract
RPS (Rock-Paper-Scissors) is a simple battle game that can play on the blockchain. The gameplay is just like the rock-paper-scissors in the real world, players choose their own cards to battle with others. But this process all is in blockchain via a smart contract. So all processes can not cheat and modified.

Our contract is open-source, you can check it on Github: https://github.com/CPChain/cpchain-dapps-handgame

## Features
1) We use an algorithm that is designed by ourselves, named Verifiable Privacy Data to ensure the game is fair for each other

2) User-friendly, everyone can create or join a game to battle at any time

3) Publish a new token named RPS to incentivize players to join games

4) The initial supply is zero, all RPS tokens are mined by Yield farming

## Gameplay

### New Game
Choose rock or paper or scissors first, then deposit an amount of CPC to start a new game (You will send a transaction to the smart contract). This game will be notified to other players, that can decide if they battle with you.

### Join
You can view games started by others, then deposit CPC to battle with him. If someone joins the same game before you, your transaction will be failed and you can not join.

### Open Card
If someone joins the battle, both parties participating in the battle can announce their cards, and the smart contract will determine the winner based on the cards selected by the players on both sides, and the winner can get the CPC deposited by both parties.

### Timeout
The verifiable private data algorithm ensures the security of data. If a player does not open the card, the smart contract (RPS contract) cannot obtain the content selected by the player, nor can it determine the result. In this case, the smart contract sets the effective time of each game. After the timeout, the player who didn’t open his card will lose.



## Yield Farming
The game involves 2 currencies, CPC and RPS.

CPC is the general Token of the main chain, which is deposited at the beginning of the game and returned to the player after the game is over.

RPS is the GameFi reward Token for gaming. Players can get RPS rewards by participating in the game. RPS Token will be used for player ranking and can also be used in other gaming games.

Create games, participate in games, and win, and you can get RPS rewards.

The specific mining methods:

1) Start game: mined 2 RPS

2) Join a game: mined 1 RPS

3) Winner: 3 RPS

4) Draw: both mined 1 RPS



If you start the game and win, you will get 5 RPS.