import React from 'react';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';

const SocketStatus = ({ status, onReconnect }) => {
  const getStatusInfo = () => {
    switch (status) {
      case 'connected':
        return {
          color: 'bg-green-500',
          icon: <Wifi className="w-4 h-4" />,
          text: 'Connected'
        };
      case 'connecting':
        return {
          color: 'bg-yellow-500',
          icon: <RefreshCw className="w-4 h-4 animate-spin" />,
          text: 'Connecting...'
        };
      case 'error':
        return {
          color: 'bg-red-500',
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Connection Error'
        };
      default:
        return {
          color: 'bg-gray-500',
          icon: <WifiOff className="w-4 h-4" />,
          text: 'Disconnected'
        };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="flex items-center gap-2 px-3 py-2 bg-white rounded-lg shadow-lg border border-gray-200">
      <div className={`w-3 h-3 rounded-full ${statusInfo.color}`}></div>
      <div className="flex items-center gap-2">
        {statusInfo.icon}
        <span className="text-sm font-medium text-gray-700">{statusInfo.text}</span>
      </div>
      {status !== 'connected' && (
        <button
          onClick={onReconnect}
          className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
        >
          Reconnect
        </button>
      )}
    </div>
  );
};

export default SocketStatus;