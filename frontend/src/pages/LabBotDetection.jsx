import React, { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../components/Loader";
import { decisionAPI } from "../services/api";
import {
  createInteractionRecorder,
  snapshotToTrafficFlow,
} from "../utils/labTelemetry";

const LabBotDetection = () => {
  const recorderRef = useRef(null);

  const [ip, setIp] = useState("192.168.1.100");
  const [recording, setRecording] = useState(false);
  const [snapshot, setSnapshot] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const flow = useMemo(() => {
    if (!snapshot) return null;
    return snapshotToTrafficFlow(snapshot);
  }, [snapshot]);

  useEffect(() => {
    recorderRef.current = createInteractionRecorder();
    return () => {
      try {
        recorderRef.current?.stop();
      } catch {
        // ignore
      }
    };
  }, []);

  const startRecording = () => {
    setResult(null);
    setError(null);
    recorderRef.current?.start();
    setRecording(true);
    setSnapshot(recorderRef.current?.snapshot());
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setRecording(false);
    setSnapshot(recorderRef.current?.snapshot());
  };

  const refreshSnapshot = () => {
    setSnapshot(recorderRef.current?.snapshot());
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const latest = recorderRef.current?.snapshot();
      setSnapshot(latest);

      const trafficFlow = snapshotToTrafficFlow(latest || snapshot || {});
      const response = await decisionAPI.analyze({
        ip,
        ua: navigator.userAgent,
        payload: "bot_detection_lab",
        flow: trafficFlow,
      });

      const prediction = response.data?.log?.prediction || {};
      const modelScores = {
        bot: prediction.bot ?? 0,
        payload: prediction.payload ?? 0,
        xss: prediction.xss ?? 0,
        ddos: prediction.ddos ?? 0,
        behavior: prediction.behavior ?? 0,
      };

      setResult({
        ...response.data.log,
        modelScores,
        flow: trafficFlow,
      });
    } catch (err) {
      setError(err.response?.data?.message || "Failed to analyze bot flow");
    } finally {
      setLoading(false);
    }
  };

  const counters = snapshot?.counters || {};

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Lab: Bot Detection
        </h1>
        <p className="text-gray-400 mt-1">
          Record browser interactions, convert to a TrafficFlow, and analyze.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            🎛️ Recorder
          </h2>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              IP Address
            </label>
            <input
              type="text"
              value={ip}
              onChange={(e) => setIp(e.target.value)}
              className="w-full px-4 py-2 bg-gray-900 border border-gray-600 text-gray-200 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
              required
            />
          </div>

          <div className="flex flex-wrap gap-3">
            {!recording ? (
              <button
                onClick={startRecording}
                className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2 px-4 rounded-lg hover:from-primary-700 hover:to-primary-800 transition-all font-medium shadow-lg"
              >
                ⏺ Start Recording
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-gradient-to-r from-warning-600 to-warning-700 text-white py-2 px-4 rounded-lg hover:from-warning-700 hover:to-warning-800 transition-all font-medium shadow-lg"
              >
                ⏹ Stop Recording
              </button>
            )}

            <button
              onClick={refreshSnapshot}
              disabled={!recording}
              className="bg-gray-900/50 border border-gray-700 text-gray-200 py-2 px-4 rounded-lg hover:border-primary-600 disabled:opacity-50 transition-all"
            >
              🔄 Refresh
            </button>

            <button
              onClick={handleAnalyze}
              disabled={!flow || loading}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-2 px-4 rounded-lg hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 transition-all font-medium shadow-lg"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Flow"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Clicks</p>
              <p className="text-lg font-bold text-gray-200">
                {counters.click || 0}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Keys</p>
              <p className="text-lg font-bold text-gray-200">
                {counters.keydown || 0}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Scroll</p>
              <p className="text-lg font-bold text-gray-200">
                {counters.scroll || 0}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Mousemove</p>
              <p className="text-lg font-bold text-gray-200">
                {counters.mousemove || 0}
              </p>
            </div>
          </div>

          <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">TrafficFlow JSON</p>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all">
              {flow ? JSON.stringify(flow, null, 2) : "Record some events..."}
            </pre>
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
            📊 Results
          </h2>

          {loading && <Loader text="Analyzing bot flow..." />}

          {error && (
            <div className="bg-danger-900/30 border border-danger-600 text-danger-300 px-4 py-3 rounded-lg animate-shake">
              {error}
            </div>
          )}

          {!loading && result && (
            <div className="space-y-6">
              <div className="flex justify-center">
                <span
                  className={`px-6 py-3 text-lg font-bold rounded-full shadow-xl ${
                    result.decision === "block"
                      ? "bg-danger-600 text-white border-2 border-danger-400 shadow-danger-600/50 animate-pulse"
                      : result.decision === "alert"
                      ? "bg-warning-600 text-white border-2 border-warning-400 shadow-warning-600/50"
                      : "bg-success-600 text-white border-2 border-success-400 shadow-success-600/50"
                  }`}
                >
                  {result.decision?.toUpperCase()}
                </span>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4">
                <p className="text-sm text-gray-400 mb-1">Threat Score</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 bg-gray-700 rounded-full h-4">
                    <div
                      className={`h-4 rounded-full transition-all ${
                        result.threatScore > 0.7
                          ? "bg-danger-600"
                          : result.threatScore > 0.4
                          ? "bg-warning-600"
                          : "bg-success-600"
                      }`}
                      style={{ width: `${(result.threatScore || 0) * 100}%` }}
                    ></div>
                  </div>
                  <span className="text-lg font-bold text-white">
                    {((result.threatScore || 0) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>

              <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-4 space-y-2">
                <p className="text-sm font-medium text-gray-300 flex items-center gap-2">
                  🤖 Model Scores
                </p>
                {Object.entries(result.modelScores).map(([model, score]) => (
                  <div
                    key={model}
                    className="flex justify-between items-center bg-gray-800/40 px-3 py-2 rounded-lg"
                  >
                    <span className="text-sm text-gray-300 capitalize">
                      {model}
                    </span>
                    <span className="text-sm font-mono text-gray-200">
                      {(Number(score) * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!loading && !result && !error && (
            <div className="text-gray-400 text-sm">
              Record then analyze to see bot confidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabBotDetection;
