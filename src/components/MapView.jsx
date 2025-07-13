import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FaCrosshairs } from "react-icons/fa";
import "../styles/Map.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const MapView = ({ onMotionDetected }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const hasCentered = useRef(false);

  useEffect(() => {
    const map = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [0, 0],
      zoom: 16,
      pitch: 60,
      bearing: -20,
      antialias: true,
    });

    mapRef.current = map;
    map.addControl(new mapboxgl.NavigationControl(), "top-right");

    map.on("load", () => {
      const layers = map.getStyle().layers;
      const labelLayerId = layers.find(
        (layer) => layer.type === "symbol" && layer.layout["text-field"]
      )?.id;

      map.addLayer(
        {
          id: "3d-buildings",
          source: "composite",
          "source-layer": "building",
          filter: ["==", "extrude", "true"],
          type: "fill-extrusion",
          minzoom: 15,
          paint: {
            "fill-extrusion-color": "#aaa",
            "fill-extrusion-height": [
              "interpolate",
              ["linear"],
              ["zoom"],
              15,
              0,
              15.05,
              ["get", "height"],
            ],
            "fill-extrusion-base": ["get", "min_height"],
            "fill-extrusion-opacity": 0.6,
          },
        },
        labelLayerId
      );
    });

    return () => map.remove();
  }, []);

  useEffect(() => {
    const handleMotion = (event) => {
      const { acceleration, rotationRate } = event;
      const totalAccel = Math.sqrt(
        (acceleration.x || 0) ** 2 +
          (acceleration.y || 0) ** 2 +
          (acceleration.z || 0) ** 2
      );
      const jerkLevel = totalAccel;
      onMotionDetected?.({ jerkLevel, totalAccel });
    };

    if (window.DeviceMotionEvent) {
      window.addEventListener("devicemotion", handleMotion);
    }
    return () => {
      window.removeEventListener("devicemotion", handleMotion);
    };
  }, []);

  useEffect(() => {
    const watchId = navigator.geolocation.watchPosition(
      ({ coords }) => {
        const { latitude, longitude } = coords;
        const newPos = [longitude, latitude];
        setUserLocation({ latitude, longitude });

        if (markerRef.current) {
          markerRef.current.setLngLat(newPos);
        } else {
          markerRef.current = new mapboxgl.Marker({ color: "#1E90FF" })
            .setLngLat(newPos)
            .addTo(mapRef.current);
        }

        if (!hasCentered.current) {
          mapRef.current.flyTo({ center: newPos, speed: 1.5 });
          hasCentered.current = true;
        }
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  const recenter = () => {
    if (userLocation) {
      mapRef.current.flyTo({
        center: [userLocation.longitude, userLocation.latitude],
        zoom: 18,
        speed: 1.2,
        essential: true,
      });
    }
  };

  return (
    <div className="map-container-wrapper">
      <div ref={mapContainer} className="map-container"></div>
      <button
        className="recenter-btn"
        onClick={recenter}
        title="Center to my location"
      >
        <FaCrosshairs />
      </button>
    </div>
  );
};

export default MapView;
