import { useState, useEffect } from "react";

function SensorPanel() {
  const [accZ, setAccZ] = useState(0);
  const [speed, setSpeed] = useState(0);

  useEffect(() => {
    if ("DeviceMotionEvent" in window) {
      window.addEventListener("devicemotion", (e) => {
        const z = e.accelerationIncludingGravity?.z || 0;
        setAccZ(z.toFixed(2));
      });
    }

    if ("geolocation" in navigator) {
      navigator.geolocation.watchPosition((pos) => {
        const spd = pos.coords.speed || 0;
        setSpeed((spd * 3.6).toFixed(1)); // m/s to km/h
      });
    }
  }, []);

  return (
    <div className="absolute bottom-0 w-full bg-white/80 backdrop-blur-md p-3 z-40">
      <div className="flex justify-between text-sm font-medium">
        <div>🚗 Speed: {speed} km/h</div>
        <div>📉 Shock Z: {accZ} m/s²</div>
      </div>
    </div>
  );
}

export default SensorPanel;
