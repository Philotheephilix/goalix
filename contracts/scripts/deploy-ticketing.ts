import { ethers } from "hardhat";
import { TicketContract as TicketContractType } from "../typechain-types/contracts/Ticketing.sol/TicketContract";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying TicketContract with the account:", deployer.address);

  const TicketContract = await ethers.getContractFactory("TicketContract");
  const ticketContract =
    (await TicketContract.deploy()) as unknown as TicketContractType;
  await ticketContract.waitForDeployment();
  console.log("TicketContract deployed to:", ticketContract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
