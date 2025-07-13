import React, { useEffect, useState } from "react";
import { FaRoad, FaTachometerAlt, FaCogs, FaArrowsAltV } from "react-icons/fa";
import "../styles/Header.css";

const Header = () => {
  const [accZ, setAccZ] = useState(0);
  const [gyroZ, setGyroZ] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);

  const [prevCoords, setPrevCoords] = useState(null);

  // Accelerometer & Gyroscope
  useEffect(() => {
    const handleMotion = (event) => {
      setAccZ(event.acceleration?.z?.toFixed(2) || 0);
      setGyroZ(event.rotationRate?.alpha?.toFixed(2) || 0);
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleMotion);
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, []);

  // GPS Speed & Distance
  useEffect(() => {
    const success = (pos) => {
      const coords = pos.coords;
      setSpeed(coords.speed ? (coords.speed * 3.6).toFixed(1) : 0); // m/s to km/h

      if (prevCoords) {
        const d = getDistanceFromLatLonInKm(
          prevCoords.latitude,
          prevCoords.longitude,
          coords.latitude,
          coords.longitude
        );
        setDistance((prev) => prev + d * 1000); // meters
      }

      setPrevCoords(coords);
    };

    const error = (err) => console.warn(`ERROR(${err.code}): ${err.message}`);

    const watchId = navigator.geolocation.watchPosition(success, error, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 5000,
    });

    return () => navigator.geolocation.clearWatch(watchId);
  }, [prevCoords]);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; // km
    const dLat = deg2rad(lat2 - lat1);
    const dLon = deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(deg2rad(lat1)) *
        Math.cos(deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const deg2rad = (deg) => deg * (Math.PI / 180);

  return (
    <header className="app-header">
      <div className="brand">Pathsynq</div>
      <div className="sensor-grid">
        <div className="sensor-item">
          <FaArrowsAltV /> {accZ}
        </div>
        <div className="sensor-item">
          <FaCogs /> {gyroZ}
        </div>
        <div className="sensor-item">
          <FaTachometerAlt /> {speed} km/h
        </div>
        <div className="sensor-item">
          <FaRoad /> {distance.toFixed(0)} m
        </div>
      </div>
    </header>
  );
};

export default Header;
