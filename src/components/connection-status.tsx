"use client";
import { useEffect, useState } from "react";

export function ConnectionStatus() {
  const [offline, setOffline] = useState(false);
  const [workerError, setWorkerError] = useState(false);
  useEffect(() => {
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker
        .register("/sw.js", { scope: "/", updateViaCache: "none" })
        .catch(() => setWorkerError(true));
    }
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return (
    <div className="status" role="status" aria-live="polite">
      {offline
        ? "You are offline. Sign-in and account pages need a connection. Offline workout logging arrives in a later phase."
        : workerError
          ? "Offline page setup failed. You can continue online; reload to retry."
          : null}
    </div>
  );
}
