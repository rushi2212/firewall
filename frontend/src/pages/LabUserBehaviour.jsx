import React, { useEffect, useMemo, useRef, useState } from "react";
import Loader from "../components/Loader";
import { decisionAPI } from "../services/api";
import { createBehaviourEvent, newSessionId } from "../utils/labTelemetry";

const LabUserBehaviour = () => {
  const sessIdRef = useRef(newSessionId());

  const [ip, setIp] = useState("192.168.1.100");
  const [recording, setRecording] = useState(false);
  const [events, setEvents] = useState([]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const pageName = useMemo(() => {
    const path = window.location.pathname || "";
    if (path.includes("/lab/behaviour")) return "LabBehaviour";
    if (path.includes("/lab")) return "Lab";
    return "Unknown";
  }, []);

  useEffect(() => {
    const onClick = () => {
      if (!recording) return;
      setEvents((prev) => [
        ...prev,
        createBehaviourEvent({
          eventName: "Click",
          pageName,
          userAgent: navigator.userAgent,
        }),
      ]);
    };

    const onKeydown = () => {
      if (!recording) return;
      setEvents((prev) => [
        ...prev,
        createBehaviourEvent({
          eventName: "Keypress",
          pageName,
          userAgent: navigator.userAgent,
        }),
      ]);
    };

    const onScroll = () => {
      if (!recording) return;
      setEvents((prev) => [
        ...prev,
        createBehaviourEvent({
          eventName: "Scroll",
          pageName,
          userAgent: navigator.userAgent,
        }),
      ]);
    };

    window.addEventListener("click", onClick);
    window.addEventListener("keydown", onKeydown);
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      window.removeEventListener("click", onClick);
      window.removeEventListener("keydown", onKeydown);
      window.removeEventListener("scroll", onScroll);
    };
  }, [pageName, recording]);

  const startRecording = () => {
    setError(null);
    setResult(null);
    sessIdRef.current = newSessionId();
    setEvents([
      createBehaviourEvent({
        eventName: "View",
        pageName,
        userAgent: navigator.userAgent,
      }),
    ]);
    setRecording(true);
  };

  const stopRecording = () => {
    setRecording(false);
  };

  const handleAnalyze = async () => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sessions = [
        {
          sessn_id: sessIdRef.current,
          events: events.slice(0, 60),
        },
      ];

      const response = await decisionAPI.analyze({
        ip,
        ua: navigator.userAgent,
        payload: "user_behaviour_lab",
        sessions,
      });

      const prediction = response.data?.log?.prediction || {};
      const modelScores = {
        behavior: prediction.behavior ?? 0,
        payload: prediction.payload ?? 0,
        xss: prediction.xss ?? 0,
        bot: prediction.bot ?? 0,
        ddos: prediction.ddos ?? 0,
      };

      setResult({
        ...response.data.log,
        modelScores,
        sessions,
      });
    } catch (err) {
      setError(
        err.response?.data?.message || "Failed to analyze behaviour sessions"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-fadeIn p-4">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
          Lab: User Behaviour Analysis
        </h1>
        <p className="text-gray-400 mt-1">
          Record a simple event timeline and analyze with the behaviour model.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6 space-y-4">
          <h2 className="text-xl font-bold text-gray-200 flex items-center gap-2">
            🧾 Session
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
                ⏺ Start Session
              </button>
            ) : (
              <button
                onClick={stopRecording}
                className="bg-gradient-to-r from-warning-600 to-warning-700 text-white py-2 px-4 rounded-lg hover:from-warning-700 hover:to-warning-800 transition-all font-medium shadow-lg"
              >
                ⏹ Stop Session
              </button>
            )}

            <button
              onClick={handleAnalyze}
              disabled={events.length === 0 || loading}
              className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white py-2 px-4 rounded-lg hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 transition-all font-medium shadow-lg"
            >
              {loading ? "Analyzing..." : "🔍 Analyze Session"}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Session ID</p>
              <p className="text-xs font-mono text-gray-200 break-all">
                {sessIdRef.current}
              </p>
            </div>
            <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-3">
              <p className="text-xs text-gray-400">Events</p>
              <p className="text-lg font-bold text-gray-200">{events.length}</p>
            </div>
          </div>

          <div className="bg-gray-900/40 border border-gray-700 rounded-lg p-3">
            <p className="text-xs text-gray-400 mb-1">Sessions JSON</p>
            <pre className="text-xs text-gray-200 whitespace-pre-wrap break-all max-h-80 overflow-auto">
              {JSON.stringify(
                [
                  {
                    sessn_id: sessIdRef.current,
                    events: events.slice(0, 20),
                  },
                ],
                null,
                2
              )}
            </pre>
            {events.length > 20 && (
              <div className="text-xs text-gray-500 mt-2">
                Showing first 20 events (will send up to 60).
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700 rounded-xl shadow-xl p-6">
          <h2 className="text-xl font-bold text-gray-200 mb-4 flex items-center gap-2">
            📊 Results
          </h2>

          {loading && <Loader text="Analyzing behaviour session..." />}

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
              Start a session and analyze to see behaviour confidence.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LabUserBehaviour;
