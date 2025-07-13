import React, { useContext, useEffect, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import {
  FaTachometerAlt,
  FaCompressArrowsAlt,
  FaArrowsAltV,
  FaRoad,
} from "react-icons/fa";
import { MotionContext } from "../context/MotionContext";
import "react-toastify/dist/ReactToastify.css";
import "../styles/Header.css";

const Header = () => {
  const { motion } = useContext(MotionContext);
  const [lastToast, setLastToast] = useState("");
  const [jerk, setJerk] = useState(0);
  const [accel, setAccel] = useState(0);
  const [gyroZ, setGyroZ] = useState(0);
  const [speed, setSpeed] = useState(0);
  const [distance, setDistance] = useState(0);
  const [prevCoords, setPrevCoords] = useState(null);

  useEffect(() => {
    if (!motion) return;

    const { jerkLevel, totalAccel } = motion;
    setJerk(jerkLevel.toFixed(2));
    setAccel(totalAccel.toFixed(2));

    let message = "";

    if (jerkLevel > 20) message = "🚨 High Jerk Detected";
    else if (totalAccel > 25) message = "🚀 High Acceleration";
    else if (jerkLevel > 10) message = "⚠️ Medium Jerk Detected";
    else if (totalAccel > 15) message = "⚡ Medium Acceleration";
    else if (jerkLevel > 5) message = "🟡 Low Jerk Detected";
    else if (totalAccel > 8) message = "🔋 Low Acceleration";

    if (message && message !== lastToast) {
      toast.dismiss();
      toast(message, {
        position: "top-left",
        autoClose: 1500,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        theme: "dark",
        style: { marginTop: "80px" },
      });
      setLastToast(message);
    }
  }, [motion]);

  useEffect(() => {
    const handleMotion = (event) => {
      setGyroZ(event.rotationRate?.alpha?.toFixed(2) || 0);
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleMotion);
    }

    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, []);

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
        // Only count distance if more than 5 meters (to avoid GPS noise)
        if (d * 1000 > 5) {
          setDistance((prev) => prev + d * 1000); // meters
        }
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
          <FaArrowsAltV /> {jerk}
        </div>
        <div className="sensor-item">
          <FaCompressArrowsAlt /> {gyroZ}
        </div>
        <div className="sensor-item">
          <FaTachometerAlt /> {speed} km/h
        </div>
        <div className="sensor-item">
          <FaRoad /> {distance.toFixed(0)} m
        </div>
      </div>
      <ToastContainer limit={1} />
    </header>
  );
};

export default Header;
