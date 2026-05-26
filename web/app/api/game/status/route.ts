import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const gameCode = searchParams.get('gameCode');
    const userAddress = searchParams.get('userAddress');

    if (!gameCode) {
      return NextResponse.json({
        success: false,
        error: 'Game code is required'
      }, { status: 400 });
    }

    // Simulate checking game status
    await new Promise(resolve => setTimeout(resolve, 500));

    // Mock game status - always return a game for demo purposes
    const gameExists = true; // Always return a game for demo

    // Mock game details
    const isActive = Math.random() > 0.5; // 50% chance game is still active
    const hasJoiner = !isActive || Math.random() > 0.7; // If active, 30% chance has joiner

    const gameDetails = {
      creator: '0xCreatorAddress123456789',
      creatorContracts: [
        '0xToken1Address123456789',
        '0xToken2Address123456789', 
        '0xToken3Address123456789',
        '0xToken4Address123456789',
        '0xToken5Address123456789'
      ],
      joiner: hasJoiner ? '0xJoinerAddress123456789' : '0x0000000000000000000000000000000000000000',
      joinerContracts: hasJoiner ? [
        '0xToken6Address123456789',
        '0xToken7Address123456789',
        '0xToken8Address123456789',
        '0xToken9Address123456789',
        '0xToken10Address123456789'
      ] : [],
      winner: isActive ? '0x0000000000000000000000000000000000000000' : (Math.random() > 0.5 ? '0xCreatorAddress123456789' : '0xJoinerAddress123456789'),
      isActive,
      createdAt: new Date(Date.now() - Math.random() * 600000).toISOString(), // Random time in last 10 minutes
      completedAt: isActive ? null : new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: {
        gameCode,
        gameDetails,
        canJoin: isActive && !hasJoiner && userAddress !== gameDetails.creator,
        userRole: userAddress === gameDetails.creator ? 'creator' : 
                 userAddress === gameDetails.joiner ? 'joiner' : null
      }
    });

  } catch (error) {
    console.error('Error checking game status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check game status'
    }, { status: 500 });
  }
} 