// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract MerchNFT is ERC721URIStorage {
    struct MerchInfo {
        uint256 id;
        string name;
        string ipfsMetadataCID; // points to metadata JSON
        uint256 price;
        uint256 supply;
        uint256 minted;
        address seller;
        IERC20 paymentToken;
    }

    uint256 public merchIdCounter;
    uint256 public tokenIdCounter;

    mapping(uint256 => MerchInfo) public merchItems; // merchId => info
    mapping(uint256 => uint256[]) public merchTokenIds; // merchId => list of NFT tokenIds
    mapping(uint256 => uint256) public tokenIdToMerchId; // tokenId => merchId

    event MerchCreated(
        uint256 indexed merchId,
        string name,
        string ipfsMetadataCID,
        uint256 price,
        uint256 supply,
        address indexed seller,
        address paymentToken
    );

    event MerchPurchased(
        uint256 indexed merchId,
        address indexed buyer,
        uint256 tokenId,
        uint256 price,
        uint256 timestamp
    );

    constructor(string memory name, string memory symbol) ERC721(name, symbol) {}

    function createMerch(
        string memory name,
        string memory ipfsMetadataCID,
        uint256 price,
        uint256 supply,
        address paymentToken
    ) external {
        require(bytes(name).length > 0, "Name required");
        require(bytes(ipfsMetadataCID).length > 0, "CID required");
        require(price > 0, "Price must be > 0");
        require(supply > 0, "Supply must be > 0");

        merchIdCounter++;
        uint256 merchId = merchIdCounter;

        merchItems[merchId] = MerchInfo({
            id: merchId,
            name: name,
            ipfsMetadataCID: ipfsMetadataCID,
            price: price,
            supply: supply,
            minted: 0,
            seller: msg.sender,
            paymentToken: IERC20(paymentToken)
        });

        emit MerchCreated(merchId, name, ipfsMetadataCID, price, supply, msg.sender, paymentToken);
    }

    function buyMerch(uint256 merchId) external {
        MerchInfo storage item = merchItems[merchId];

        require(item.minted < item.supply, "Sold out");

        item.minted += 1;

        uint256 tokenId = ++tokenIdCounter;
        tokenIdToMerchId[tokenId] = merchId;
        merchTokenIds[merchId].push(tokenId);

        require(
            item.paymentToken.transferFrom(msg.sender, item.seller, item.price),
            "Payment failed"
        );

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, item.ipfsMetadataCID);

        emit MerchPurchased(merchId, msg.sender, tokenId, item.price, block.timestamp);
    }

    function getMerchDetails(uint256 merchId)
        external
        view
        returns (
            string memory name,
            string memory ipfsCID,
            uint256 price,
            uint256 supply,
            uint256 minted,
            address seller,
            address paymentToken
        )
    {
        MerchInfo storage item = merchItems[merchId];
        return (
            item.name,
            item.ipfsMetadataCID,
            item.price,
            item.supply,
            item.minted,
            item.seller,
            address(item.paymentToken)
        );
    }

    function getMerchTokenIds(uint256 merchId) external view returns (uint256[] memory) {
        return merchTokenIds[merchId];
    }

    function getMerchIdFromTokenId(uint256 tokenId) external view returns (uint256) {
        return tokenIdToMerchId[tokenId];
    }

    function listAllMerch() external view returns (MerchInfo    [] memory) {
        MerchInfo[] memory merchList = new MerchInfo[](merchIdCounter);
        for (uint256 i = 1; i <= merchIdCounter; i++) {
            merchList[i - 1] = merchItems[i];
        }
        return merchList;
    }
}
