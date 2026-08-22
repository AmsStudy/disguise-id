"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { subscribeCamera, unsubscribeCamera } from "@/services/socket";
import { useAlertStore } from "@/store/alertStore";
import type { LiveDetection } from "@/types";

const LiveCamera = ({ cameraId }: { cameraId: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  const dpoMatchRef = useRef<{ name: string; activeUntil: number } | null>(null);
  const targetBoxesRef = useRef<any[]>([]);
  const currentBoxesRef = useRef<any[]>([]);
  const frameDimensionsRef = useRef<{ fw: number; fh: number }>({ fw: 1920, fh: 1080 });

  // WebRTC state refs
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Listen for DPO alerts in Zustand
    const unsub = useAlertStore.subscribe((state, prevState) => {
      if (state.alerts.length > 0 && state.alerts[0] !== prevState.alerts[0]) {
        const latestAlert = state.alerts[0] as any;
        const camId = latestAlert.camera?.id || latestAlert.camera_id;
        if (camId === cameraId) {
          const name = latestAlert.person?.fullName || latestAlert.person?.full_name || 'DPO';
          dpoMatchRef.current = { name, activeUntil: Date.now() + 3000 };
        }
      }
    });
    return () => unsub();
  }, [cameraId]);

  const cleanupPeerConnection = useCallback(() => {
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = null;
    }
    if (pcRef.current) {
      try {
        pcRef.current.ontrack = null;
        pcRef.current.oniceconnectionstatechange = null;
        pcRef.current.onconnectionstatechange = null;
        pcRef.current.close();
      } catch (_) {}
      pcRef.current = null;
    }
  }, []);

  const startWebRTC = useCallback(async () => {
    if (!isMountedRef.current) return;
    cleanupPeerConnection();

    setIsConnecting(true);

    try {
      const pc = new RTCPeerConnection({
        iceServers: [
          { urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }
        ]
      });
      pcRef.current = pc;

      pc.addTransceiver("video", { direction: "recvonly" });
      pc.addTransceiver("audio", { direction: "recvonly" });

      pc.ontrack = (event) => {
        if (!isMountedRef.current) return;
        if (videoRef.current && event.streams && event.streams[0]) {
          videoRef.current.srcObject = event.streams[0];
          videoRef.current.play().catch((err) => {
            console.warn("[WebRTC] Autoplay play() caught:", err.message);
          });
          setError(null);
          setIsConnecting(false);
        }
      };

      pc.oniceconnectionstatechange = () => {
        if (!isMountedRef.current) return;
        const state = pc.iceConnectionState;
        if (state === "disconnected" || state === "failed") {
          console.warn(`[WebRTC] ICE state ${state}, re-establishing in 2s...`);
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) startWebRTC();
          }, 2000);
        }
      };

      pc.onconnectionstatechange = () => {
        if (!isMountedRef.current) return;
        const state = pc.connectionState;
        if (state === "failed") {
          console.warn("[WebRTC] Connection failed, reconnecting in 2s...");
          if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
          retryTimeoutRef.current = setTimeout(() => {
            if (isMountedRef.current) startWebRTC();
          }, 2000);
        }
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const whepBaseUrl = process.env.NEXT_PUBLIC_MEDIAMTX_WHEP_BASE_URL || "https://stream.disguise.id";
      const cleanBase = whepBaseUrl.replace(/\/+$/, "");
      const response = await fetch(`${cleanBase}/${cameraId}/whep`, {
        method: "POST",
        headers: {
          "Content-Type": "application/sdp",
        },
        body: offer.sdp,
      });

      if (!response.ok) {
        throw new Error("Stream CCTV belum siap (404/400). Menunggu input dari kamera...");
      }

      const answerSdp = await response.text();
      if (!isMountedRef.current) return;
      await pc.setRemoteDescription({
        type: "answer",
        sdp: answerSdp,
      });

      setIsConnecting(false);
    } catch (err: any) {
      if (!isMountedRef.current) return;
      console.warn("[WebRTC]", err.message);
      setError(err.message || "Gagal memuat live stream. Mencoba kembali...");
      setIsConnecting(false);

      if (retryTimeoutRef.current) clearTimeout(retryTimeoutRef.current);
      retryTimeoutRef.current = setTimeout(() => {
        if (isMountedRef.current) startWebRTC();
      }, 3000);
    }
  }, [cameraId, cleanupPeerConnection]);

  // Tab Visibility & Focus recovery
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        const video = videoRef.current;
        const pc = pcRef.current;

        // If video is paused or peerConnection is disconnected/closed, re-establish
        if (!pc || pc.connectionState === "disconnected" || pc.connectionState === "failed" || pc.connectionState === "closed") {
          console.info("[WebRTC] Tab became visible, refreshing stream...");
          startWebRTC();
        } else if (video && video.paused) {
          video.play().catch(() => {
            startWebRTC();
          });
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [startWebRTC]);

  useEffect(() => {
    isMountedRef.current = true;
    let clearCanvasTimeout: NodeJS.Timeout;
    let animationFrameId: number;

    // Smooth Interpolation (Lerp) Render Loop
    const renderLoop = () => {
      if (!isMountedRef.current) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video && video.videoWidth > 0 && video.videoHeight > 0) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);

          const targets = targetBoxesRef.current;
          const currents = currentBoxesRef.current;

          if (currents.length !== targets.length) {
            currentBoxesRef.current = [...targets].map((t) => [...t]);
          } else {
            for (let i = 0; i < targets.length; i++) {
              currents[i][0] += (targets[i][0] - currents[i][0]) * 0.45;
              currents[i][1] += (targets[i][1] - currents[i][1]) * 0.45;
              currents[i][2] += (targets[i][2] - currents[i][2]) * 0.45;
              currents[i][3] += (targets[i][3] - currents[i][3]) * 0.45;
              currents[i][4] = targets[i][4];
            }
          }

          const { fw, fh } = frameDimensionsRef.current;
          const scaleX = canvas.width / (fw || 1920);
          const scaleY = canvas.height / (fh || 1080);

          currentBoxesRef.current.forEach(([x, y, w, h, conf]) => {
            const sx = x * scaleX;
            const sy = y * scaleY;
            const sw = w * scaleX;
            const sh = h * scaleY;

            let boxColor = "#00E5FF";
            let bgColor = "rgba(0, 229, 255, 0.8)";
            let label = conf !== undefined ? `Face ${conf}` : "";

            const dpo = dpoMatchRef.current;
            if (dpo && Date.now() < dpo.activeUntil) {
              boxColor = "#FF0055";
              bgColor = "rgba(255, 0, 85, 0.9)";
              label = `MATCH: ${dpo.name}`;
            } else if (conf !== undefined) {
              if (conf >= 0.8) {
                boxColor = "#00FF00";
                bgColor = "rgba(0, 255, 0, 0.8)";
              } else if (conf >= 0.5) {
                boxColor = "#FFFF00";
                bgColor = "rgba(255, 255, 0, 0.8)";
              } else {
                boxColor = "#FF0000";
                bgColor = "rgba(255, 0, 0, 0.8)";
              }
            }

            ctx.strokeStyle = boxColor;
            ctx.lineWidth = 3;
            ctx.strokeRect(sx, sy, sw, sh);

            const len = 15;
            ctx.beginPath();
            ctx.moveTo(sx, sy + len); ctx.lineTo(sx, sy); ctx.lineTo(sx + len, sy);
            ctx.moveTo(sx + sw - len, sy); ctx.lineTo(sx + sw, sy); ctx.lineTo(sx + sw, sy + len);
            ctx.moveTo(sx + sw, sy + sh - len); ctx.lineTo(sx + sw, sy + sh); ctx.lineTo(sx + sw - len, sy + sh);
            ctx.moveTo(sx + len, sy + sh); ctx.lineTo(sx, sy + sh); ctx.lineTo(sx, sy + sh - len);
            ctx.stroke();

            if (label) {
              ctx.font = '14px "JetBrains Mono", monospace, sans-serif';
              ctx.textBaseline = "top";
              const textMetrics = ctx.measureText(label);
              const textW = textMetrics.width + 8;
              const textH = 20;
              ctx.fillStyle = bgColor;
              ctx.fillRect(sx, Math.max(0, sy - textH), textW, textH);
              ctx.fillStyle = "#000000";
              ctx.fillText(label, sx + 4, Math.max(0, sy - textH) + 3);
            }
          });
        }
      }
      animationFrameId = requestAnimationFrame(renderLoop);
    };
    renderLoop();

    // Subscribe to live tracking bounding boxes
    const handleLiveDetection = (data: LiveDetection) => {
      if (!data.bboxes) return;
      targetBoxesRef.current = data.bboxes;
      frameDimensionsRef.current = { fw: data.frameWidth || 1920, fh: data.frameHeight || 1080 };

      if (clearCanvasTimeout) {
        clearTimeout(clearCanvasTimeout);
      }
      clearCanvasTimeout = setTimeout(() => {
        if (isMountedRef.current) {
          targetBoxesRef.current = [];
          currentBoxesRef.current = [];
        }
      }, 500);
    };

    subscribeCamera(cameraId, handleLiveDetection);

    startWebRTC();

    return () => {
      isMountedRef.current = false;
      unsubscribeCamera(cameraId);
      cleanupPeerConnection();
      cancelAnimationFrame(animationFrameId);
    };
  }, [cameraId, startWebRTC, cleanupPeerConnection]);

  return (
    <div className="relative w-full h-full overflow-hidden bg-black flex items-center justify-center">
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-10 text-red-400 font-semibold p-4 text-center">
          <p className="mb-3">{error}</p>
          <button
            onClick={() => startWebRTC()}
            className="px-4 py-1.5 bg-[#00E5FF]/20 hover:bg-[#00E5FF]/30 border border-[#00E5FF]/50 text-[#00E5FF] rounded-lg text-xs font-mono transition-colors"
          >
            Reconnect Stream
          </button>
        </div>
      )}

      {/* 
        Video Properties:
        - autoPlay & muted & playsInline: Crucial for allowing autoplay in modern browsers
        - object-contain: Ensures the whole stream is visible
      */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        onLoadedMetadata={() => {
          videoRef.current?.play().catch(() => {});
        }}
        className="w-full h-full object-contain"
      />

      {/* Canvas for Live Bounding Box Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none object-contain"
      />

      <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md">
        <span className={`w-2.5 h-2.5 rounded-full ${isConnecting ? "bg-yellow-400 animate-ping" : "bg-red-500 animate-pulse"}`}></span>
        {isConnecting ? "CONNECTING..." : "LIVE CAMERA"}
      </div>

      <div className="absolute bottom-4 right-4 flex items-center gap-2">
        <button
          onClick={() => startWebRTC()}
          className="bg-black/60 hover:bg-white/10 text-white/80 hover:text-white px-2.5 py-1 rounded-md text-xs font-mono backdrop-blur-sm border border-white/10 transition-colors"
          title="Segarkan Aliran Video"
        >
          🔄 Reconnect
        </button>
        <span className="bg-black/60 text-white/80 px-3 py-1 rounded-md text-xs font-mono backdrop-blur-sm border border-white/10">
          WebRTC WHEP
        </span>
      </div>
    </div>
  );
};

export default LiveCamera;
