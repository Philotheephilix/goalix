'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { isValidGameCode } from '../../lib/game-utils';

interface GameControlsProps {
  isDisabled: boolean;
  onStartGame: () => Promise<void>;
  onJoinGame: (gameCode: string) => Promise<void>;
}

const GameControls = ({ isDisabled, onStartGame, onJoinGame }: GameControlsProps) => {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    console.log('GameControls: Start button clicked');
    console.log('isDisabled:', isDisabled);
    console.log('onStartGame function:', !!onStartGame);
    
    if (isDisabled) {
      console.log('Button is disabled, not proceeding');
      return;
    }
    
    setLoading(true);
    try {
      await onStartGame();
    } catch (error) {
      console.error('Error in handleStart:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async () => {
    console.log('GameControls: Join button clicked');
    console.log('joinCode:', joinCode);
    console.log('onJoinGame function:', !!onJoinGame);
    
    if (!joinCode) {
      console.log('No join code provided');
      return;
    }
    
    setLoading(true);
    try {
      await onJoinGame(joinCode);
    } catch (error) {
      console.error('Error in handleJoin:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-auto pt-4 border-t border-zinc-700 z-50">
      <div className="flex flex-col gap-3">
        {/* Start new game */}
        <Button
          onClick={handleStart}
          disabled={isDisabled}
          className="w-full bg-red-600/20 text-red-400 hover:bg-red-600/30 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Processing...' : 'Start New Game'}
        </Button>
        
        {/* Debug info */}
        {isDisabled && (
          <div className="text-xs text-zinc-500 mt-2 p-2 bg-zinc-800/50 rounded">
            <div>Button disabled because:</div>
            <div>• Need exactly 5 players selected</div>
            <div>• Wallet must be connected</div>
            <div>• All tokens must be validated</div>
          </div>
        )}

        {/* Join game */}
        {!showJoinInput && (
          <Button
            onClick={() => setShowJoinInput(true)}
            className="w-full bg-zinc-700/50 hover:bg-zinc-600/50 disabled:opacity-50"
          >
            Join Existing Game
          </Button>
        )}

        {/* Join code input */}
        {showJoinInput && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                type="text"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                placeholder="Enter game code (0x...)"
                className="flex-1 bg-zinc-800 border border-zinc-600 rounded-md px-3 text-sm"
              />
              <Button onClick={handleJoin} disabled={!joinCode || loading}>
                {loading ? 'Processing...' : 'Join'}
              </Button>
            </div>
            {joinCode && (
              <div className="text-xs text-zinc-500">
                {isValidGameCode(joinCode) ? (
                  <span className="text-green-400">✓ Valid game code format</span>
                ) : (
                  <span className="text-red-400">✗ Invalid format (should be 0x + 64 hex characters)</span>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameControls; 