import { useEffect, useRef, useState } from "react";
import { io, type Socket } from "socket.io-client";

const getBackendUrl = () => {
  if (process.env.NEXT_PUBLIC_WS_URL) {
    return process.env.NEXT_PUBLIC_WS_URL;
  }
  if (typeof window !== "undefined" && window.location.hostname) {
    const protocol = window.location.protocol === "https:" ? "https:" : "http:";
    return `${protocol}//${window.location.hostname}:8080`;
  }
  return "http://localhost:8080";
};

interface WeightData {
  weight: number;
  isStable: boolean;
  unit: string;
}

export const useKioskSocket = (sessionId: string) => {
  const socketRef = useRef<Socket | null>(null);
  const [isPaired, setIsPaired] = useState(false);
  const [weightData, setWeightData] = useState<WeightData>({
    weight: 0,
    isStable: false,
    unit: "kg",
  });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionId) return;

    const backendUrl = getBackendUrl();
    const socket = io(backendUrl, {
      transports: ["websocket", "polling"],
      reconnectionAttempts: 5,
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      setError(null);
      // pair with kiosk session upon connection
      socket.emit("web:join-session", { sessionId });
    });

    socket.on("connect_error", (_err) => {
      setError(
        `Cannot connect to backend (${backendUrl}). Ensure port 8080 is reachable.`,
      );
    });

    // listen for successful pairing
    socket.on("status:paired", () => {
      setIsPaired(true);
      setError(null);
    });

    // listen for real-time weight data
    socket.on("web:weight-mirror", (data: WeightData) => {
      setWeightData(data);
    });

    socket.on("error", (err: { message: string }) => {
      setError(err.message);
    });

    // clean up socket on unmount
    return () => {
      socket.disconnect();
    };
  }, [sessionId]);

  // send heartbeat to refresh 3min TTL
  const sendHeartbeat = () => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("web:heartbeat", { sessionId });
    }
  };

  const submitParcel = (payload: {
    receiverName: string;
    receiverPhone: string;
    receiverAddress: string;
  }) => {
    return new Promise((resolve, reject) => {
      if (!socketRef.current?.connected) {
        return reject(new Error(`Socket disconnected`));
      }

      socketRef.current.emit(
        "web:submit-parcel",
        { sessionId, ...payload },
        (response: { success: boolean }) => {
          resolve(response);
        },
      );
    });
  };

  return {
    isPaired,
    weightData,
    error,
    sendHeartbeat,
    submitParcel,
  };
};
