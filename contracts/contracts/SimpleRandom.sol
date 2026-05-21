// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract SimpleRandom {
    // Mapping to store user => random number
    mapping(address => bytes32) public userRandomNumbers;
    mapping(address => uint256) public lastRequestTime;
    
    // Events
    event RandomNumberRequested(address indexed user, bytes32 userRandomNumber, uint256 timestamp);
    event RandomNumberGenerated(address indexed user, bytes32 randomNumber, uint256 timestamp);

    // Request a random number
    function requestRandomNumber(bytes32 userRandomNumber) external {
        require(lastRequestTime[msg.sender] == 0 || block.timestamp > lastRequestTime[msg.sender] + 60, "Wait 1 minute between requests");
        
        lastRequestTime[msg.sender] = block.timestamp;
        
        // Generate a pseudo-random number using block data and user input
        bytes32 randomNumber = keccak256(abi.encodePacked(
            block.timestamp,
            block.prevrandao,
            blockhash(block.number - 1),
            userRandomNumber,
            msg.sender
        ));
        
        userRandomNumbers[msg.sender] = randomNumber;
        
        emit RandomNumberRequested(msg.sender, userRandomNumber, block.timestamp);
        emit RandomNumberGenerated(msg.sender, randomNumber, block.timestamp);
    }

    // Get the random number for a user
    function getRandomNumber(address user) external view returns (bytes32) {
        return userRandomNumbers[user];
    }

    // Get random number as uint256
    function getRandomNumberAsUint(address user) external view returns (uint256) {
        return uint256(userRandomNumbers[user]);
    }

    // Get random number in a range (0 to max-1)
    function getRandomNumberInRange(address user, uint256 max) external view returns (uint256) {
        require(max > 0, "Max must be greater than 0");
        return uint256(userRandomNumbers[user]) % max;
    }

    // Check if user has a random number
    function hasRandomNumber(address user) external view returns (bool) {
        return userRandomNumbers[user] != bytes32(0);
    }

    // Get last request time for a user
    function getLastRequestTime(address user) external view returns (uint256) {
        return lastRequestTime[user];
    }
} 