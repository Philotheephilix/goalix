import { ethers } from "hardhat";

// One-off testnet seeding script: populates the MerchNFT marketplace with a
// handful of Argentina / football themed items so the web /marketplace page
// renders real products. The `ipfsMetadataCID` field is repurposed to hold a
// full https image URL (the marketplace treats values starting with "http" as
// a direct image URL, bypassing the unconfigured Pinata gateway).
//
// Run: npx hardhat run scripts/seed-merch.ts --network xlayer

const MERCH_ADDRESS = "0x7EBe0903D6DdF8588DceB956F171F5869988a0D7";
const ARG_FAN_TOKEN = "0x45b2bAeD94107fBa50EE4832BC8820470D535E53"; // 18 decimals

type SeedItem = {
  name: string;
  imageUrl: string; // stored in ipfsMetadataCID, verified 200
  priceArg: string; // human units of ARG (18 decimals)
  supply: number;
};

// All image URLs verified to return HTTP 200 before use.
const ITEMS: SeedItem[] = [
  {
    name: "Argentina Home Jersey 2022",
    imageUrl: "https://placehold.co/640x480/75AADB/ffffff.png?text=Argentina+Home+Jersey+2022",
    priceArg: "3",
    supply: 100,
  },
  {
    name: "Messi #10 Shirt",
    imageUrl: "https://media.api-sports.io/football/players/154.png",
    priceArg: "5",
    supply: 100,
  },
  {
    name: "World Cup Match Ball",
    imageUrl: "https://placehold.co/640x480/111111/ffffff.png?text=World+Cup+Match+Ball",
    priceArg: "2",
    supply: 120,
  },
  {
    name: "Argentina Training Cap",
    imageUrl: "https://placehold.co/640x480/6CACE4/0b1c3a.png?text=Argentina+Training+Cap",
    priceArg: "1",
    supply: 150,
  },
  {
    name: "Di Maria #11 Boots",
    imageUrl: "https://media.api-sports.io/football/players/266.png",
    priceArg: "4",
    supply: 80,
  },
  {
    name: "Albiceleste Away Jersey",
    imageUrl: "https://placehold.co/640x480/4B0082/ffffff.png?text=Albiceleste+Away+Jersey",
    priceArg: "3",
    supply: 100,
  },
  {
    name: "Lautaro Martinez #22 Shirt",
    imageUrl: "https://media.api-sports.io/football/players/217.png",
    priceArg: "4",
    supply: 90,
  },
  {
    name: "World Cup Champions Scarf",
    imageUrl: "https://placehold.co/640x480/75AADB/0b1c3a.png?text=Champions+Scarf",
    priceArg: "2",
    supply: 130,
  },
];

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Seeding merch with account:", deployer.address);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "OKB");

  const merch = await ethers.getContractAt("MerchNFT", MERCH_ADDRESS);

  const before = await merch.merchIdCounter();
  console.log("merchIdCounter before:", before.toString());

  for (const item of ITEMS) {
    const price = ethers.parseUnits(item.priceArg, 18);
    console.log(`\nCreating: "${item.name}" (${item.priceArg} ARG, supply ${item.supply})`);
    console.log("  image:", item.imageUrl);

    const tx = await merch.createMerch(
      item.name,
      item.imageUrl, // stored in ipfsMetadataCID
      price,
      item.supply,
      ARG_FAN_TOKEN,
      { gasLimit: 1_000_000 }
    );
    console.log("  tx:", tx.hash);
    const receipt = await tx.wait();
    console.log("  confirmed in block", receipt?.blockNumber);
  }

  // Verify by reading back the full list.
  const all = await merch.listAllMerch();
  console.log(`\n=== listAllMerch() => ${all.length} items ===`);
  for (const m of all) {
    console.log(
      `  #${m.id.toString()}  ${m.name}  | price=${ethers.formatUnits(m.price, 18)} ARG` +
        `  | supply=${m.supply.toString()}  | img=${m.ipfsMetadataCID}`
    );
  }
  console.log(`\nFinal on-chain item count: ${all.length}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  });
