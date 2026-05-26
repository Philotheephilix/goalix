import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { contractAddresses, userAddress } = body;

    if (!contractAddresses || !Array.isArray(contractAddresses) || contractAddresses.length !== 5) {
      return NextResponse.json({
        success: false,
        error: 'Exactly 5 contract addresses are required'
      }, { status: 400 });
    }

    if (!userAddress) {
      return NextResponse.json({
        success: false,
        error: 'User address is required'
      }, { status: 400 });
    }

    // Generate a mock game code (32-byte hex string)
    const gameCode = '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Mock transaction hash
    const transactionHash = '0x' + Array.from({ length: 64 }, () => 
      Math.floor(Math.random() * 16).toString(16)
    ).join('');

    // Simulate blockchain delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    return NextResponse.json({
      success: true,
      data: {
        gameCode,
        transactionHash,
        creator: userAddress,
        creatorContracts: contractAddresses,
        joiner: '0x0000000000000000000000000000000000000000',
        joinerContracts: [],
        winner: '0x0000000000000000000000000000000000000000',
        isActive: true,
        createdAt: new Date().toISOString(),
        message: 'Game created successfully! Share the game code with another player to join.'
      }
    });

  } catch (error) {
    console.error('Error creating game:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create game'
    }, { status: 500 });
  }
} 