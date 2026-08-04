"use client";

import React, { useEffect, useRef, useState } from "react";

const LiveCamera = ({ cameraId }: { cameraId: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let peerConnection: RTCPeerConnection | null = null;
    let retryTimeout: NodeJS.Timeout;
    let isMounted = true;

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

        const response = await fetch(`http://172.125.0.255:8889/${cameraId}/whep`, {
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
      clearTimeout(retryTimeout);
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
