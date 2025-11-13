import React, { useState } from "react";
import { useApp } from "../context/AppContext";

const Settings = () => {
  const { apiUrl, setApiUrl, refreshInterval, setRefreshInterval } = useApp();
  const [localApiUrl, setLocalApiUrl] = useState(apiUrl);
  const [localRefreshInterval, setLocalRefreshInterval] =
    useState(refreshInterval);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setApiUrl(localApiUrl);
    setRefreshInterval(localRefreshInterval);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fadeIn">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Settings
        </h1>
        <p className="text-gray-400 mt-1">Configure your WAF system</p>
      </div>

      {saved && (
        <div className="bg-success-900/30 border border-success-600 text-success-300 px-4 py-3 rounded-lg">
          ✅ Settings saved successfully!
        </div>
      )}

      {/* API Configuration */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
          <span>🔌</span> API Configuration
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Backend API URL
            </label>
            <input
              type="text"
              value={localApiUrl}
              onChange={(e) => setLocalApiUrl(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent placeholder-gray-500"
              placeholder="http://localhost:5000/api"
            />
            <p className="text-xs text-gray-500 mt-1">
              The base URL for the backend API endpoint
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Refresh Interval (seconds)
            </label>
            <input
              type="number"
              value={localRefreshInterval / 1000}
              onChange={(e) =>
                setLocalRefreshInterval(Number(e.target.value) * 1000)
              }
              min="1"
              max="60"
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              How often to refresh logs and stats (1-60 seconds)
            </p>
          </div>
        </div>
      </div>

      {/* Security Settings */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
          <span>🛡️</span> Security Settings
        </h2>
        <div className="space-y-4">
          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Block Threshold (%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="70"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0% (Permissive)</span>
              <span>50%</span>
              <span>100% (Strict)</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Threat score threshold for blocking requests
            </p>
          </div>

          <div className="p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Alert Threshold (%)
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue="40"
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-600"
            />
            <div className="flex justify-between text-xs text-gray-500 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Threat score threshold for alerting
            </p>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-900/50 rounded-lg border border-gray-700">
            <div>
              <p className="font-medium text-gray-200">
                Auto-Block High Threats
              </p>
              <p className="text-sm text-gray-400">
                Automatically block requests with threat score ≥ 90%
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Model Settings */}
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl shadow-xl p-6 border border-gray-700">
        <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
          <span>🤖</span> Model Settings
        </h2>
        <div className="space-y-3">
          {[
            "BiLSTM Payload Detection",
            "XSS Detection",
            "Bot Detection",
            "User Behaviour Analysis",
          ].map((model) => (
            <div
              key={model}
              className="flex items-center justify-between p-3 bg-gray-900/50 rounded-lg border border-gray-700"
            >
              <span className="text-sm font-medium text-gray-300">{model}</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-500/50 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end">
        <button
          onClick={handleSave}
          className="bg-gradient-to-r from-primary-600 to-primary-700 text-white px-8 py-3 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium shadow-lg hover:shadow-xl hover:shadow-primary-600/50 transform hover:-translate-y-0.5"
        >
          💾 Save Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;
