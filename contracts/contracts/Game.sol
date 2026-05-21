// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

// ERC20 interface
interface IERC20 {
    function balanceOf(address account) external view returns (uint256);
    function transferFrom(address from, address to, uint256 amount) external returns (bool);
    function transfer(address to, uint256 amount) external returns (bool);
}

// PlayerToken interface
interface IPlayerToken {
    function calculatePerformance(string memory position) external view returns (uint8);
    function getPlayerMetadata() external view returns (
        uint256 playerId,
        string memory name,
        string memory teamname,
        string memory position,
        string memory league,
        string memory season
    );
}

contract GameContractMultiToken {
    // Struct to store game information
    struct Game {
        address creator;
        address[] creatorContracts;
        address joiner;
        address[] joinerContracts;
        bytes32 randomNumber;
        address winner;
        bool isActive;
        // Track staked tokens for each player and contract
        mapping(address => mapping(address => uint256)) stakedTokens; // user => tokenContract => amount
    }

    // Contract state
    mapping(bytes32 => Game) public games;
    mapping(address => bytes32) public userToGameCode;
    uint256 public constant TOKENS_PER_CONTRACT = 200;
    uint256 public constant CONTRACT_COUNT = 5;

    // Events
    event GameCreated(address indexed creator, bytes32 gameCode, uint256 timestamp);
    event GameJoined(address indexed joiner, bytes32 gameCode, uint256 timestamp);
    event GameCompleted(address indexed winner, bytes32 gameCode, uint256 totalScore, uint256 timestamp);
    event TokensStaked(address indexed user, bytes32 gameCode, address[] tokenContracts, uint256 timestamp);
    event TokensDistributed(address indexed winner, bytes32 gameCode, address[] tokenContracts, uint256 timestamp);

    // Create a new game
    function createGame(address[] memory contractAddresses) external returns (bytes32) {
        require(contractAddresses.length == CONTRACT_COUNT, "Must provide 5 ERC20 contract addresses");
        require(userToGameCode[msg.sender] == bytes32(0), "User already in a game");

        // Validate that all contracts are ERC20 tokens and user has sufficient balance
        for (uint256 i = 0; i < contractAddresses.length; i++) {
            IERC20 token = IERC20(contractAddresses[i]);
            require(token.balanceOf(msg.sender) >= TOKENS_PER_CONTRACT, "Insufficient token balance");
        }

        // Generate game code
        bytes32 gameCode = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            blockhash(block.number - 1),
            msg.sender
        ));

        // Initialize game
        Game storage game = games[gameCode];
        game.creator = msg.sender;
        game.creatorContracts = contractAddresses;
        game.isActive = true;

        // Stake tokens from all contracts
        _stakeTokens(msg.sender, gameCode, contractAddresses);

        userToGameCode[msg.sender] = gameCode;
        emit GameCreated(msg.sender, gameCode, block.timestamp);
        return gameCode;
    }

    // Join an existing game - Simplified version without strict modifiers
    function joinGame(bytes32 gameCode, address[] memory contractAddresses) external {
        Game storage game = games[gameCode];
        
        // Only check if game exists and is active
        require(game.isActive, "Game does not exist or is completed");
        
        // Allow joining even if already in a game (for testing)
        // require(userToGameCode[msg.sender] == bytes32(0), "User already in a game");
        
        // Allow joining even if game already has a joiner (for testing)
        // require(game.joiner == address(0), "Game already has a joiner");
        
        // Allow any number of contract addresses (for testing)
        // require(contractAddresses.length == CONTRACT_COUNT, "Must provide 5 ERC20 contract addresses");
        
        // Skip balance checks for now (for testing)
        // for (uint256 i = 0; i < contractAddresses.length; i++) {
        //     IERC20 token = IERC20(contractAddresses[i]);
        //     require(token.balanceOf(msg.sender) >= TOKENS_PER_CONTRACT, "Insufficient token balance");
        // }

        // Set joiner (overwrite if already exists)
        game.joiner = msg.sender;
        game.joinerContracts = contractAddresses;

        // Skip token staking for now (for testing)
        // _stakeTokens(msg.sender, gameCode, contractAddresses);

        // Generate random number and play game
        _generateRandomNumber(gameCode);
        _playGame(gameCode);

        userToGameCode[msg.sender] = gameCode;
        emit GameJoined(msg.sender, gameCode, block.timestamp);
    }

    // Internal function to stake tokens from multiple contracts
    function _stakeTokens(address user, bytes32 gameCode, address[] memory contractAddresses) internal {
        Game storage game = games[gameCode];
        
        for (uint256 i = 0; i < contractAddresses.length; i++) {
            IERC20 token = IERC20(contractAddresses[i]);
            require(token.transferFrom(user, address(this), TOKENS_PER_CONTRACT), "Token transfer failed");
            game.stakedTokens[user][contractAddresses[i]] = TOKENS_PER_CONTRACT;
        }
        
        emit TokensStaked(user, gameCode, contractAddresses, block.timestamp);
    }

    // Internal function to generate random number
    function _generateRandomNumber(bytes32 gameCode) internal {
        Game storage game = games[gameCode];
        game.randomNumber = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            blockhash(block.number - 1),
            gameCode,
            game.creator,
            game.joiner
        ));
    }

    // Internal function to rotate array based on random number
    function _rotateArray(address[] memory arr, uint256 shift) internal pure returns (address[] memory) {
        address[] memory rotated = new address[](arr.length);
        for (uint256 i = 0; i < arr.length; i++) {
            rotated[i] = arr[(i + shift) % arr.length];
        }
        return rotated;
    }

    // Internal function to play the game - Simplified version
    function _playGame(bytes32 gameCode) internal {
        Game storage game = games[gameCode];
        
        // Rotate creator's contracts based on random number
        uint256 shift = uint256(game.randomNumber) % CONTRACT_COUNT;
        address[] memory rotatedCreatorContracts = _rotateArray(game.creatorContracts, shift);

        // Get scores by calculating performance for each PlayerToken contract
        uint256 creatorScore = 0;
        uint256 joinerScore = 0;

        // Use minimum length to avoid array bounds issues
        uint256 numContracts = game.joinerContracts.length < CONTRACT_COUNT ? game.joinerContracts.length : CONTRACT_COUNT;

        for (uint256 i = 0; i < numContracts; i++) {
            IPlayerToken creatorToken = IPlayerToken(rotatedCreatorContracts[i]);
            IPlayerToken joinerToken = IPlayerToken(game.joinerContracts[i]);
            
            // Get creator player performance
            try creatorToken.getPlayerMetadata() returns (
                uint256 playerId,
                string memory name,
                string memory teamname,
                string memory position,
                string memory league,
                string memory season
            ) {
                try creatorToken.calculatePerformance(position) returns (uint8 cScore) {
                    creatorScore += uint256(cScore);
                } catch {
                    creatorScore += 0; // Handle failed performance calculation
                }
            } catch {
                creatorScore += 0; // Handle failed metadata retrieval
            }
            
            // Get joiner player performance
            try joinerToken.getPlayerMetadata() returns (
                uint256 playerId,
                string memory name,
                string memory teamname,
                string memory position,
                string memory league,
                string memory season
            ) {
                try joinerToken.calculatePerformance(position) returns (uint8 jScore) {
                    joinerScore += uint256(jScore);
                } catch {
                    joinerScore += 0; // Handle failed performance calculation
                }
            } catch {
                joinerScore += 0; // Handle failed metadata retrieval
            }
        }

        // Determine winner
        address winner = creatorScore >= joinerScore ? game.creator : game.joiner;
        address loser = winner == game.creator ? game.joiner : game.creator;
        game.winner = winner;
        game.isActive = false;

        // Skip token distribution for now (since tokens weren't staked)
        // _distributeTokens(gameCode, winner, loser);

        // Clean up
        delete userToGameCode[game.creator];
        delete userToGameCode[game.joiner];

        emit GameCompleted(winner, gameCode, creatorScore >= joinerScore ? creatorScore : joinerScore, block.timestamp);
    }

    // Internal function to distribute tokens to winner
    function _distributeTokens(bytes32 gameCode, address winner, address loser) internal {
        Game storage game = games[gameCode];
        
        // Get all unique token contracts from both players
        address[] memory allContracts = new address[](CONTRACT_COUNT * 2);
        
        // Add creator contracts
        for (uint256 i = 0; i < CONTRACT_COUNT; i++) {
            allContracts[i] = game.creatorContracts[i];
        }
        
        // Add joiner contracts
        for (uint256 i = 0; i < CONTRACT_COUNT; i++) {
            allContracts[CONTRACT_COUNT + i] = game.joinerContracts[i];
        }
        
        // Transfer all staked tokens to winner
        for (uint256 i = 0; i < allContracts.length; i++) {
            address tokenContract = allContracts[i];
            
            // Transfer winner's staked tokens back to winner
            uint256 winnerStaked = game.stakedTokens[winner][tokenContract];
            if (winnerStaked > 0) {
                IERC20(tokenContract).transfer(winner, winnerStaked);
            }
            
            // Transfer loser's staked tokens to winner
            uint256 loserStaked = game.stakedTokens[loser][tokenContract];
            if (loserStaked > 0) {
                IERC20(tokenContract).transfer(winner, loserStaked);
            }
        }
        
        emit TokensDistributed(winner, gameCode, allContracts, block.timestamp);
    }

    // View functions
    function getGameDetails(bytes32 gameCode) external view returns (
        address creator,
        address[] memory creatorContracts,
        address joiner,
        address[] memory joinerContracts,
        address winner,
        bool isActive
    ) {
        Game storage game = games[gameCode];
        return (
            game.creator,
            game.creatorContracts,
            game.joiner,
            game.joinerContracts,
            game.winner,
            game.isActive
        );
    }

    function getStakedTokens(bytes32 gameCode, address user, address tokenContract) external view returns (uint256) {
        return games[gameCode].stakedTokens[user][tokenContract];
    }

    function getAllStakedTokens(bytes32 gameCode, address user) external view returns (address[] memory contracts, uint256[] memory amounts) {
        Game storage game = games[gameCode];
        
        // Determine which contracts to check based on user role
        address[] memory userContracts;
        if (user == game.creator) {
            userContracts = game.creatorContracts;
        } else if (user == game.joiner) {
            userContracts = game.joinerContracts;
        } else {
            // Return empty arrays for non-participants
            return (new address[](0), new uint256[](0));
        }
        
        contracts = new address[](userContracts.length);
        amounts = new uint256[](userContracts.length);
        
        for (uint256 i = 0; i < userContracts.length; i++) {
            contracts[i] = userContracts[i];
            amounts[i] = game.stakedTokens[user][userContracts[i]];
        }
    }
}