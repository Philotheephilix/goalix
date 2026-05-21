// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PlayerToken is ERC20, Ownable {
    IERC20 public paymentToken;
    uint256 public basePrice;

    struct PlayerMetadata {
        uint256 playerId;
        string name;
        string teamname;
        string position;
        string league;
        string season;
    }

    struct PlayerStats {
        uint256 goals;
        uint256 assists;
        uint256 penalties_scored;
        uint256 shots_total;
        uint256 shots_on_target;
        uint256 duels_total;
        uint256 duels_won;
        uint256 tackles_total;
        uint256 appearances;
        uint256 yellow_cards;
        uint256 red_cards;
        uint256 lastUpdated;
    }

    PlayerMetadata public playerMetadata;
    PlayerStats public playerStats;

    mapping(uint256 => PlayerStats) public statsHistory;
    uint256[] public updateTimestamps;

    // Season end and claim variables
    uint256 public playerShare;
    bool public seasonEnded;
    uint256 public seasonEndTimestamp;
    mapping(address => uint256) public userClaims;
    mapping(address => bool) public hasClaimed;

    event PlayerDataUpdated(
        uint256 indexed playerId,
        uint256 goals,
        uint256 assists,
        uint256 appearances,
        uint256 timestamp
    );

    event SeasonEnded(
        uint256 timestamp,
        uint256 playerShareAmount,
        uint256 totalTokenPool
    );

    event TokensClaimed(
        address indexed user,
        uint256 amount,
        uint256 tokensBurned,
        uint256 timestamp
    );

    event PlayerClaimed(
        address indexed user,
        string name,
        uint256 amount,
        string nullifier,
        uint256 timestamp
    );

    constructor(
        string memory name,
        string memory symbol,
        address _paymentToken
    ) ERC20(name, symbol) Ownable(msg.sender) {
        paymentToken = IERC20(_paymentToken);
        basePrice = 1 ether; // default price base
        seasonEnded = false;
        playerShare = 0;
    }

    function initialize(
        uint256 _playerId,
        string memory _name,
        string memory _teamname,
        string memory _position,
        string memory _league,
        string memory _season,
        uint256 _initialSupply
    ) external onlyOwner {
        require(playerMetadata.playerId == 0, "Already initialized");

        playerMetadata = PlayerMetadata({
            playerId: _playerId,
            name: _name,
            teamname: _teamname,
            position: _position,
            league: _league,
            season: _season
        });

        playerStats.lastUpdated = block.timestamp;
        _mint(address(this), _initialSupply); // Mint to contract itself
    }

    function updatePlayerStats(PlayerStats calldata _stats) external onlyOwner {
        uint256 timestamp = block.timestamp;
        statsHistory[timestamp] = playerStats;
        updateTimestamps.push(timestamp);

        playerStats = _stats;
        playerStats.lastUpdated = timestamp;

        emit PlayerDataUpdated(
            playerMetadata.playerId,
            _stats.goals,
            _stats.assists,
            _stats.appearances,
            timestamp
        );
    }

    function getPlayerMetadata() external view returns (
        uint256 playerId,
        string memory name,
        string memory teamname,
        string memory position,
        string memory league,
        string memory season
    ) {
        return (
            playerMetadata.playerId,
            playerMetadata.name,
            playerMetadata.teamname,
            playerMetadata.position,
            playerMetadata.league,
            playerMetadata.season
        );
    }

    function getPlayerStats() external view returns (
        uint256 goals,
        uint256 assists,
        uint256 penalties_scored,
        uint256 shots_total,
        uint256 shots_on_target,
        uint256 duels_total,
        uint256 duels_won,
        uint256 tackles_total,
        uint256 appearances,
        uint256 yellow_cards,
        uint256 red_cards
    ) {
        return (
            playerStats.goals,
            playerStats.assists,
            playerStats.penalties_scored,
            playerStats.shots_total,
            playerStats.shots_on_target,
            playerStats.duels_total,
            playerStats.duels_won,
            playerStats.tackles_total,
            playerStats.appearances,
            playerStats.yellow_cards,
            playerStats.red_cards
        );
    }

    function getStatsHistory(uint256 timestamp) external view returns (PlayerStats memory) {
        return statsHistory[timestamp];
    }

    function getUpdateTimestamps() external view returns (uint256[] memory) {
        return updateTimestamps;
    }

    function getUpdateCount() external view returns (uint256) {
        return updateTimestamps.length;
    }

    function decimals() public view virtual override returns (uint8) {
        return 0;
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

    function purchaseTokens(uint256 amount) external {
        require(amount > 0, "Amount must be > 0");
        require(balanceOf(address(this)) >= amount, "Not enough tokens");

        uint256 totalCost = calculateTotalPrice(amount);
        require(paymentToken.transferFrom(msg.sender, address(this), totalCost), "Payment failed");

        _transfer(address(this), msg.sender, amount);
    }

    function getUnitPrice(
        uint256 tokensSold,
        uint256 tokensInReserve,
        uint256 perf
    ) internal view returns (uint256) {
        uint256 PRECISION = 1e18;
        uint256 perfFactor = (perf * PRECISION) / 10;
        uint256 ratio = (tokensSold * PRECISION) / (tokensInReserve + 1);

        uint256 price = (basePrice * perfFactor * (PRECISION + ratio)) / (PRECISION * PRECISION);
        return price;
    }

    function calculateTotalPrice(uint256 amount) public view returns (uint256) {
        require(amount > 0, "Invalid amount");

        uint256 PRECISION = 1e18;
        uint256 S = balanceOf(address(this)); // Reserve
        uint256 D = totalSupply() - S;        // Demand
        require(amount <= S, "Not enough reserve tokens");

        uint256 perf = uint256(calculatePerformance(playerMetadata.position));
        uint256 perfFactor = (perf * PRECISION) / 10; // 1 to 10 => 0.1 to 1.0

        uint256 totalCost = 0;
        uint256 currentReserve = S;
        uint256 currentDemand = D;

        for (uint256 i = 0; i < amount; i++) {
            uint256 ratio = (currentDemand * PRECISION) / (currentReserve + 1);
            uint256 price = (basePrice * perfFactor * (PRECISION + ratio)) / (PRECISION * PRECISION);
            totalCost += price;

            currentReserve -= 1;
            currentDemand += 1;
        }

        return totalCost;
    }

    function approvePaymentToken(address spender, uint256 amount) external {
        paymentToken.approve(spender, amount);
    }

    function getPaymentTokenBalance() external view returns (uint256) {
        return paymentToken.balanceOf(address(this));
    }

    function withdrawPaymentTokens(address to, uint256 amount) external onlyOwner {
        require(paymentToken.transfer(to, amount), "Withdraw failed");
    }

    // END SEASON FUNCTION
    function endSeason() external onlyOwner {
        require(!seasonEnded, "Season already ended");
        
        uint256 totalTokenPool = paymentToken.balanceOf(address(this));
        require(totalTokenPool > 0, "No tokens in pool");
        
        // Calculate 20% of token pool for player's share
        playerShare = (totalTokenPool * 20) / 100;
        seasonEnded = true;
        seasonEndTimestamp = block.timestamp;
        
        emit SeasonEnded(seasonEndTimestamp, playerShare, totalTokenPool);
    }

    // CLAIM FUNCTION
    function claim() external {
        require(seasonEnded, "Season not ended yet");
        require(balanceOf(msg.sender) > 0, "No tokens to claim for");
        require(!hasClaimed[msg.sender], "Already claimed");
        
        // Calculate available pool for distribution (total - player's share)
        uint256 totalTokenPool = paymentToken.balanceOf(address(this));
        uint256 distributionPool = totalTokenPool - playerShare;
        
        // Calculate total tokens sold (total supply - contract balance)
        uint256 totalTokensSold = totalSupply() - balanceOf(address(this));
        require(totalTokensSold > 0, "No tokens sold");
        
        // Get user's full token balance
        uint256 userTokens = balanceOf(msg.sender);
        
        // Calculate user's full share based on their token holdings
        uint256 userShare = (distributionPool * userTokens) / totalTokensSold;
        
        require(userShare > 0, "No share to claim");
        require(paymentToken.balanceOf(address(this)) >= userShare, "Insufficient contract balance");
        
        // Mark as claimed to prevent double claiming
        hasClaimed[msg.sender] = true;
        
        // Track user claims
        userClaims[msg.sender] = userShare;
        
        // Burn ALL user's tokens
        _burn(msg.sender, userTokens);
        
        // Transfer full share to user
        require(paymentToken.transfer(msg.sender, userShare), "Transfer failed");
        
        emit TokensClaimed(msg.sender, userShare, userTokens, block.timestamp);
    }

    // PLAYER CLAIM FUNCTION
    function playerClaim(
        string memory name,
        uint256 goals,
        uint256 assists,
        uint256 penalties_scored,
        uint256 shots_total,
        uint256 shots_on_target,
        uint256 duels_total,
        uint256 duels_won,
        uint256 tackles_total,
        uint256 appearances,
        uint256 yellow_cards,
        uint256 red_cards,
        string memory nullifier
    ) external {
        require(seasonEnded, "Season not ended yet");
        require(!hasClaimed[msg.sender], "Already claimed");
        require(bytes(name).length > 0, "Name cannot be empty");
        require(bytes(nullifier).length > 0, "Nullifier cannot be empty");
        
        // Verify this is a legitimate claim (you might want to add more verification)
        require(playerShare > 0, "No player share available");
        require(paymentToken.balanceOf(address(this)) >= playerShare, "Insufficient contract balance");
        
        // Mark as claimed
        hasClaimed[msg.sender] = true;
        
        // Transfer player's share
        require(paymentToken.transfer(msg.sender, playerShare), "Transfer failed");
        
        // Reset player share to prevent double claiming
        playerShare = 0;
        
        emit PlayerClaimed(msg.sender, name, playerShare, nullifier, block.timestamp);
    }

    // Helper function to get user's claimable amount
    function getClaimableAmount(address user) external view returns (uint256) {
        if (!seasonEnded) return 0;
        if (hasClaimed[user]) return 0;
        
        uint256 totalTokenPool = paymentToken.balanceOf(address(this));
        uint256 distributionPool = totalTokenPool - playerShare;
        uint256 totalTokensSold = totalSupply() - balanceOf(address(this));
        
        if (totalTokensSold == 0) return 0;
        
        uint256 userTokens = balanceOf(user);
        uint256 userShare = (distributionPool * userTokens) / totalTokensSold;
        
        return userShare;
    }

    // Helper function to check if user has already claimed
    function hasUserClaimed(address user) external view returns (bool) {
        return hasClaimed[user];
    }

    // Helper function to get total user claims
    function getUserClaims(address user) external view returns (uint256) {
        return userClaims[user];
    }

    function calculatePerformance(string memory position) public view returns (uint8) {
        uint256 score = 0;
        bytes32 pos = keccak256(abi.encodePacked(toLower(position)));
        if (pos == keccak256(abi.encodePacked("attacker"))) {
            score = 5 * playerStats.goals +
                    3 * playerStats.assists +
                    2 * playerStats.shots_on_target +
                    1 * playerStats.duels_won;
            if (score > 100) score = 100;
            score = score / 10;
        } else if (pos == keccak256(abi.encodePacked("defender"))) {
            int256 tempScore = int256(
                4 * playerStats.tackles_total +
                2 * playerStats.duels_won
            ) - int256(2 * (playerStats.yellow_cards + playerStats.red_cards));
            if (tempScore < 0) tempScore = 0;
            if (tempScore > 100) tempScore = 100;
            score = uint256(tempScore) / 10;
        } else if (pos == keccak256(abi.encodePacked("goalkeeper"))) {
            uint256 cardPenalty = (playerStats.yellow_cards + 2 * playerStats.red_cards) * 10;
            uint256 cardFactor = cardPenalty > 100 ? 0 : 100 - cardPenalty;
            score = cardFactor / 10;
        } else if (pos == keccak256(abi.encodePacked("midfielder"))) {
            score = 3 * playerStats.goals +
                    4 * playerStats.assists +
                    1 * playerStats.duels_won;
            if (score > 100) score = 100;
            score = score / 10;
        } else {
            score = (playerStats.goals + playerStats.assists + playerStats.duels_won) / 3;
            if (score < 1) score = 1;
            else if (score > 10) score = 10;
            return uint8(score);
        }
        if (score < 1) score = 1;
        if (score > 10) score = 10;
        return uint8(score);
    }

    // ASCII lowercase helper
    function toLower(string memory str) internal pure returns (string memory) {
        bytes memory bStr = bytes(str);
        bytes memory bLower = new bytes(bStr.length);
        for (uint i = 0; i < bStr.length; i++) {
            if ((uint8(bStr[i]) >= 65) && (uint8(bStr[i]) <= 90)) {
                bLower[i] = bytes1(uint8(bStr[i]) + 32);
            } else {
                bLower[i] = bStr[i];
            }
        }
        return string(bLower);
    }
}