// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract TicketContract  {
    struct TicketListing {
        uint256 matchId;
        uint256 price; // in token
        uint256 available;
        address seller;
        IERC20 paymentToken;
    }

    mapping(uint256 => TicketListing) public ticketListings; // matchId => listing
    mapping(uint256 => mapping(address => bool)) public hasPurchased; // matchId => buyer => bool
    uint256[] public activeMatchIds; // Track active match IDs

    event TicketListed(
        uint256 indexed matchId,
        uint256 price,
        uint256 quantity,
        address indexed seller,
        address paymentToken
    );

    event TicketPurchased(
        uint256 indexed matchId,
        address indexed buyer,
        uint256 price,
        uint256 timestamp
    );

    // Player lists tickets
    function listTickets(
        uint256 matchId,
        uint256 price,
        uint256 quantity,
        address paymentToken
    ) external {
        require(price > 0, "Price must be > 0");
        require(quantity > 0, "Quantity must be > 0");
        require(ticketListings[matchId].available == 0, "Already listed");

        ticketListings[matchId] = TicketListing({
            matchId: matchId,
            price: price,
            available: quantity,
            seller: msg.sender,
            paymentToken: IERC20(paymentToken)
        });

        activeMatchIds.push(matchId);
        emit TicketListed(matchId, price, quantity, msg.sender, paymentToken);
    }

    // Fan buys a ticket
    function buyTicket(uint256 matchId) external {
        TicketListing storage listing = ticketListings[matchId];

        require(listing.available > 0, "Tickets sold out");
        require(!hasPurchased[matchId][msg.sender], "Already purchased");

        listing.available -= 1;
        hasPurchased[matchId][msg.sender] = true;

        require(
            listing.paymentToken.transferFrom(msg.sender, listing.seller, listing.price),
            "Payment failed"
        );

        emit TicketPurchased(matchId, msg.sender, listing.price, block.timestamp);
    }

    // View functions
    function hasUserPurchased(uint256 matchId, address user) external view returns (bool) {
        return hasPurchased[matchId][user];
    }

    function getTicketDetails(uint256 matchId)
        external
        view
        returns (uint256 price, uint256 available, address seller, address paymentToken)
    {
        TicketListing storage listing = ticketListings[matchId];
        return (listing.price, listing.available, listing.seller, address(listing.paymentToken));
    }

    function listAllTickets() external view returns (TicketListing[] memory) {
        uint256 totalListings = 0;
        for (uint256 i = 0; i < activeMatchIds.length; i++) {
            if (ticketListings[activeMatchIds[i]].available > 0) {
                totalListings++;
            }
        }
        
        TicketListing[] memory result = new TicketListing[](totalListings);
        uint256 index = 0;
        for (uint256 i = 0; i < activeMatchIds.length; i++) {
            if (ticketListings[activeMatchIds[i]].available > 0) {
                result[index] = ticketListings[activeMatchIds[i]];
                index++;
            }
        }
        return result;
    }
}
