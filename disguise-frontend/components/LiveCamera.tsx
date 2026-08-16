"use client";

import React, { useEffect, useRef, useState } from "react";
import { subscribeCamera, unsubscribeCamera } from "@/services/socket";
import { useAlertStore } from "@/store/alertStore";
import type { LiveDetection } from "@/types";

const LiveCamera = ({ cameraId }: { cameraId: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState<string | null>(null);

  const dpoMatchRef = useRef<{ name: string; activeUntil: number } | null>(null);
  const targetBoxesRef = useRef<any[]>([]);
  const currentBoxesRef = useRef<any[]>([]);
  const frameDimensionsRef = useRef<{ fw: number; fh: number }>({ fw: 1920, fh: 1080 });

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

  useEffect(() => {
    let peerConnection: RTCPeerConnection | null = null;
    let retryTimeout: NodeJS.Timeout;
    let clearCanvasTimeout: NodeJS.Timeout;
    let animationFrameId: number;
    let isMounted = true;
    
    // Smooth Interpolation (Lerp) Render Loop
    const renderLoop = () => {
      if (!isMounted) return;
      const canvas = canvasRef.current;
      const video = videoRef.current;
      if (canvas && video) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          const targets = targetBoxesRef.current;
          const currents = currentBoxesRef.current;
          
          // Simple exact-length matching for Lerp
          if (currents.length !== targets.length) {
             currentBoxesRef.current = [...targets].map(t => [...t]);
          } else {
             for (let i = 0; i < targets.length; i++) {
                currents[i][0] += (targets[i][0] - currents[i][0]) * 0.45; // x
                currents[i][1] += (targets[i][1] - currents[i][1]) * 0.45; // y
                currents[i][2] += (targets[i][2] - currents[i][2]) * 0.45; // w
                currents[i][3] += (targets[i][3] - currents[i][3]) * 0.45; // h
                currents[i][4] = targets[i][4]; // conf (instant update)
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

            let boxColor = '#00E5FF';
            let bgColor = 'rgba(0, 229, 255, 0.8)';
            let label = conf !== undefined ? `Face ${conf}` : '';
            
            const dpo = dpoMatchRef.current;
            if (dpo && Date.now() < dpo.activeUntil) {
              boxColor = '#FF0055'; // Bright Red/Pink for DPO
              bgColor = 'rgba(255, 0, 85, 0.9)';
              label = `MATCH: ${dpo.name}`;
            } else if (conf !== undefined) {
              if (conf >= 0.8) {
                boxColor = '#00FF00'; bgColor = 'rgba(0, 255, 0, 0.8)';
              } else if (conf >= 0.5) {
                boxColor = '#FFFF00'; bgColor = 'rgba(255, 255, 0, 0.8)';
              } else {
                boxColor = '#FF0000'; bgColor = 'rgba(255, 0, 0, 0.8)';
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
              ctx.textBaseline = 'top';
              const textMetrics = ctx.measureText(label);
              const textW = textMetrics.width + 8;
              const textH = 20;
              ctx.fillStyle = bgColor;
              ctx.fillRect(sx, Math.max(0, sy - textH), textW, textH);
              ctx.fillStyle = '#000000';
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
        if (isMounted) {
           targetBoxesRef.current = [];
           currentBoxesRef.current = [];
        }
      }, 500);
    };
    
    subscribeCamera(cameraId, handleLiveDetection);

    const startWebRTC = async () => {
      try {
        peerConnection = new RTCPeerConnection();

        peerConnection.addTransceiver("video", { direction: "recvonly" });
        peerConnection.addTransceiver("audio", { direction: "recvonly" });

        peerConnection.ontrack = (event) => {
          if (videoRef.current && event.streams && event.streams[0]) {
            videoRef.current.srcObject = event.streams[0];
            setError(null); // Clear error on successful connection
          }
        };

        const offer = await peerConnection.createOffer();
        await peerConnection.setLocalDescription(offer);

        const whepBaseUrl = process.env.NEXT_PUBLIC_MEDIAMTX_WHEP_BASE_URL || "http://localhost:8889";
        const response = await fetch(`${whepBaseUrl}/${cameraId}/whep`, {
          method: "POST",
          headers: {
            "Content-Type": "application/sdp",
          },
          body: offer.sdp,
        });

        if (!response.ok) {
          throw new Error("Stream belum siap (400). Mencoba lagi dalam 3 detik...");
        }

        const answerSdp = await response.text();
        await peerConnection.setRemoteDescription({
          type: "answer",
          sdp: answerSdp,
        });
      } catch (err: any) {
        if (!isMounted) return;
        // Don't use console.error to avoid Next.js dev overlay crash
        console.warn("[WebRTC]", err.message);
        setError(err.message || "Gagal memuat live stream. Retrying...");
        
        // Auto-retry after 3 seconds
        retryTimeout = setTimeout(() => {
          if (peerConnection) peerConnection.close();
          startWebRTC();
        }, 3000);
      }
    };

    startWebRTC();

    return () => {
      isMounted = false;
      unsubscribeCamera(cameraId);
      clearTimeout(retryTimeout);
      cancelAnimationFrame(animationFrameId);
      if (peerConnection) {
        peerConnection.close();
      }
    };
  }, [cameraId]);

  return (
    <div className="relative w-full max-w-4xl mx-auto overflow-hidden rounded-2xl bg-gray-950 shadow-2xl border border-gray-800">
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 text-red-400 font-semibold p-4 text-center">
          <p>Terjadi kesalahan memuat stream CCTV:<br/>{error}</p>
        </div>
      )}
      
      {/* 
        Video Properties:
        - autoPlay & muted & playsInline: Crucial for allowing autoplay in modern browsers
        - object-cover: Ensures the stream fills the container cleanly
      */}
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="w-full aspect-video object-cover"
      />
      
      {/* Canvas for Live Bounding Box Overlay */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
        style={{ objectFit: 'cover' }}
      />
      
      <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/60 text-white px-4 py-2 rounded-full text-sm font-semibold backdrop-blur-md">
        <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse"></span>
        LIVE CAMERA (Tapo)
      </div>
      
      <div className="absolute bottom-4 right-4 bg-black/60 text-white/80 px-3 py-1 rounded-md text-xs font-mono backdrop-blur-sm">
        WebRTC / Low Latency
      </div>
    </div>
  );
};

export default LiveCamera;
