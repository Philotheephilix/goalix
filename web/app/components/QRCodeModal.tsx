'use client';


import { Button } from '@/components/ui/button';
import { QRCodeSVG } from 'qrcode.react';

interface QRCodeModalProps {
  gameCode: string;
  onClose: () => void;
}

const QRCodeModal = ({ gameCode, onClose }: QRCodeModalProps) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-zinc-900 border border-red-500/30 rounded-lg p-6 text-center">
        <h2 className="text-2xl font-bold mb-4">Game Created!</h2>
        <p className="text-zinc-400 mb-4">Share this code with a friend to join:</p>
        <div className="bg-white p-4 inline-block rounded-lg">
          <QRCodeSVG value={gameCode} size={128} />
        </div>
        <p className="text-4xl font-mono mt-4">{gameCode}</p>
        <Button onClick={onClose} className="mt-6">
          Close
        </Button>
      </div>
    </div>
  );
};

export default QRCodeModal; 