# Game Integration Documentation

## Overview

This document describes the integration between the Next.js frontend and the smart contract for the football game system. The integration allows users to create and join games using their player tokens, with real-time validation and game state management.

## Smart Contract Integration

### Contract Address
- **Game Contract**: `0x0A32adFb8d10732A5BF6aE2aB8fA42ca3a69D087`
- **Network**: Chiliz Chain (Testnet/Mainnet)

### Key Features

1. **Token Validation**: Real-time checking of token balances and allowances using individual ERC20 calls
2. **Game State Management**: Tracking active games and user participation
3. **Automatic Token Staking**: 200 tokens per contract are staked when joining games
4. **Winner Determination**: Smart contract calculates winner based on player performance
5. **Token Distribution**: Winner receives all staked tokens from both players

## Frontend Components

### 1. Game Page (`/game/page.tsx`)

**Features:**
- Token selection interface (up to 5 players)
- Real-time token validation using individual ERC20 calls
- Game creation and joining
- QR code generation for game sharing
- Token approval helper

**Key Functions:**
- `handleStartGameContract()`: Creates a new game
- `handleJoinGameContract()`: Joins an existing game
- `validateTokens()`: Checks token balances and allowances individually

### 2. Battle Page (`/game/battle/page.tsx`)

**Features:**
- Real-time game status monitoring
- Winner determination display
- Game result visualization
- Token distribution confirmation

**Key Functions:**
- Fetches game details from smart contract
- Displays real game results (not simulated)
- Shows winner and token distribution status

### 3. Token Approval Helper (`/components/TokenApprovalHelper.tsx`)

**Features:**
- Batch token approval interface
- Individual token approval
- Approval status tracking
- Error handling and user feedback

## Game Flow

### 1. Game Creation
1. User selects 5 player tokens
2. System validates token balances and allowances using individual ERC20 calls
3. If validation fails, user can approve tokens via helper
4. User clicks "Start New Game"
5. Smart contract creates game and returns game code
6. QR code modal displays for sharing

### 2. Game Joining
1. User selects 5 player tokens
2. System validates tokens using individual ERC20 calls
3. User enters game code
4. Smart contract joins game and determines winner
5. User is redirected to battle page

### 3. Game Resolution
1. Battle page fetches game details
2. Shows game status (active/completed)
3. If completed, displays winner and token distribution
4. If active, shows processing animation

## Token Requirements

### Balance Requirements
- **Minimum Balance**: 200 tokens per player token contract
- **Total Required**: 1000 tokens (5 players × 200 tokens each)

### Approval Requirements
- **Approval Amount**: 200 tokens per contract
- **Approval Target**: Game contract address
- **One-time Setup**: Approvals persist until revoked

## Smart Contract Functions Used

### Read Functions (Available in Contract)
- `userToGameCode(address user)`: Check if user is in a game (public mapping)
- `getGameDetails(bytes32 gameCode)`: Get game information
- `getStakedTokens(bytes32 gameCode, address user, address tokenContract)`: Get staked tokens for a user
- `getAllStakedTokens(bytes32 gameCode, address user)`: Get all staked tokens for a user
- `TOKENS_PER_CONTRACT`: Get tokens required per contract (constant)
- `CONTRACT_COUNT`: Get number of contracts required (constant)

### Write Functions
- `createGame(address[] contractAddresses)`: Create new game
- `joinGame(bytes32 gameCode, address[] contractAddresses)`: Join existing game

### Events
- `GameCreated`: Emitted when game is created
- `GameJoined`: Emitted when player joins game
- `GameCompleted`: Emitted when game ends
- `TokensStaked`: Emitted when tokens are staked
- `TokensDistributed`: Emitted when tokens are distributed to winner

### Individual ERC20 Functions (for validation)
- `balanceOf(address owner)`: Check token balance
- `allowance(address owner, address spender)`: Check token allowance

## Error Handling

### Common Errors
1. **Insufficient Balance**: User doesn't have enough tokens
2. **Insufficient Allowance**: Tokens not approved for game contract
3. **Already in Game**: User is already participating in a game
4. **Invalid Game Code**: Game doesn't exist or is completed
5. **Transaction Failed**: Network or contract errors

### Token Validation Strategy
The system uses individual ERC20 calls for token validation:
- **Balance Check**: Calls `balanceOf()` on each token contract
- **Allowance Check**: Calls `allowance()` on each token contract
- **Validation Logic**: Ensures each token has ≥200 balance and allowance
- **Error Recovery**: Gracefully handles failed token calls

### Error Recovery
- Individual token validation with visual indicators
- Token approval helper for fixing allowance issues
- Clear error messages with actionable steps
- Retry mechanisms for failed transactions

## User Experience Features

### Visual Feedback
- Real-time token validation status
- Loading states during transactions
- Success/error notifications
- Game state indicators

### Accessibility
- Clear error messages
- Step-by-step guidance
- Visual indicators for all states
- Responsive design for mobile

## Testing

### Test Scenarios
1. **Token Selection**: Verify 5-token limit and validation
2. **Game Creation**: Test successful game creation flow
3. **Game Joining**: Test joining with valid game code
4. **Error Handling**: Test various error conditions
5. **Token Approval**: Test approval helper functionality

### Test Data
- Use test tokens with sufficient balances
- Test with insufficient balances
- Test with unapproved tokens
- Test with invalid game codes

## Security Considerations

### Smart Contract Security
- Token validation on-chain
- Proper access controls
- Secure random number generation
- Protected against reentrancy attacks

### Frontend Security
- Input validation
- Transaction confirmation
- Error handling
- No sensitive data exposure

## Deployment

### Contract Deployment
1. Deploy GameContractMultiToken
2. Update contract address in frontend
3. Verify contract on block explorer
4. Test with test tokens

### Frontend Deployment
1. Update contract address in constants
2. Test all game flows
3. Deploy to production
4. Monitor for errors

## Monitoring

### Key Metrics
- Game creation success rate
- Game joining success rate
- Token approval success rate
- Error frequency and types
- User engagement metrics

### Logging
- Contract events
- User interactions
- Error occurrences
- Performance metrics

## Future Enhancements

### Planned Features
1. **Game History**: Track past games and results
2. **Leaderboards**: Show top players and teams
3. **Tournaments**: Multi-player tournaments
4. **Advanced Statistics**: Detailed player performance
5. **Social Features**: Share results and achievements

### Technical Improvements
1. **Gas Optimization**: Reduce transaction costs
2. **Batch Operations**: Approve multiple tokens at once
3. **Caching**: Cache game state for better performance
4. **Real-time Updates**: WebSocket integration for live updates
5. **Mobile Optimization**: Enhanced mobile experience

## Support

### Troubleshooting
1. Check token balances and approvals
2. Verify network connection
3. Clear browser cache
4. Check contract address
5. Review error messages

### Contact
- Technical issues: Check console logs
- Contract issues: Verify on block explorer
- User experience: Review error messages
- Performance: Monitor network requests 