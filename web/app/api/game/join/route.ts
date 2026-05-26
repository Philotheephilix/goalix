import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { gameCode, contractAddresses, userAddress } = body;

    if (!gameCode || !contractAddresses || !Array.isArray(contractAddresses) || contractAddresses.length !== 5) {
      return NextResponse.json({
        success: false,
        error: 'Game code and exactly 5 contract addresses are required'
      }, { status: 400 });
    }

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'User address is required'
      }, { status: 400 });
    }

    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Mock transaction hash
    const transactionHash = '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Randomly select winner (50/50 chance)
    const isCreatorWinner = Math.random() > 0.5;
    const winner = isCreatorWinner ? '0xCreatorAddress123456789' : userAddress;

    // Mock game details
    const gameDetails = {
      creator: '0xCreatorAddress123456789',
      creatorContracts: [
        '0xToken1Address123456789',
        '0xToken2Address123456789', 
        '0xToken3Address123456789',
        '0xToken4Address123456789',
        '0xToken5Address123456789'
      ],
      joiner: userAddress,
      joinerContracts: contractAddresses,
      winner,
      isActive: false, // Game is completed after joining
      createdAt: new Date(Date.now() - 300000).toISOString(), // 5 minutes ago
      completedAt: new Date().toISOString(),
      transactionHash
    };

    // Mock token transfers to winner
    const allTokens = [...gameDetails.creatorContracts, ...gameDetails.joinerContracts];
    const tokenTransfers = allTokens.map(tokenAddress => ({
      tokenAddress,
      from: isCreatorWinner ? userAddress : gameDetails.creator,
      to: winner,
      amount: '200',
      transactionHash: '0x' + Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')
    }));

    return NextResponse.json({
      success: true,
      data: {
        gameDetails,
        tokenTransfers,
        winner,
        isCreatorWinner,
        message: `Game completed! ${isCreatorWinner ? 'Creator' : 'Joiner'} wins! All tokens have been transferred to the winner.`
      }
    });

  } catch (error) {
    console.error('Error joining game:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to join game'
    }, { status: 500 });
  }
} 