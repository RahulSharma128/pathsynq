import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { FaCrosshairs, FaPlay, FaStop } from "react-icons/fa";
import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "../styles/Map.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const downloadJSON = (data, filename = "session.json") => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json",
  });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
};

const MapView = ({ onMotionDetected }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const [userLocation, setUserLocation] = useState(null);
  const hasCentered = useRef(false);
  const pathSegmentsRef = useRef([]);
  const lastCoordRef = useRef(null);
  const lastJerkRef = useRef(0);
  const accelTriggered = useRef(false);
  const [recording, setRecording] = useState(false);
  const recordedSession = useRef([]);

  const getColorFromJerk = (jerk) => {
    if (jerk > 20) return "#ff0000";
    if (jerk > 10) return "#ffa500";
    return "#00ff00";
  };

  const updatePathLayer = () => {
    const geojson = {
      type: "FeatureCollection",
      features: pathSegmentsRef.current.map((segment) => ({
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: segment.coords,
        },
        properties: {
          color: segment.color,
        },
      })),
    };

    const source = mapRef.current.getSource("jerk-path");
    if (source) {
      source.setData(geojson);
    }
  };

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

      map.addSource("jerk-path", {
        type: "geojson",
        data: {
          type: "FeatureCollection",
          features: [],
        },
      });

      map.addLayer({
        id: "jerk-colored-line",
        type: "line",
        source: "jerk-path",
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": ["get", "color"],
          "line-width": 4,
        },
      });
    });

    return () => map.remove();
  }, []);

  useEffect(() => {
    const handleMotion = (event) => {
      const { acceleration } = event;
      const totalAccel = Math.sqrt(
        (acceleration.x || 0) ** 2 +
          (acceleration.y || 0) ** 2 +
          (acceleration.z || 0) ** 2
      );
      const jerkLevel = totalAccel;
      lastJerkRef.current = jerkLevel;

      if (jerkLevel > 2.5) {
        accelTriggered.current = true;
      }

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
    const pollGPSOnce = () => {
      navigator.geolocation.getCurrentPosition(
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

          const last = lastCoordRef.current;
          if (last && (last[0] !== newPos[0] || last[1] !== newPos[1])) {
            const segment = {
              coords: [last, newPos],
              color: getColorFromJerk(lastJerkRef.current),
            };
            pathSegmentsRef.current.push(segment);
            updatePathLayer();

            if (recording) {
              recordedSession.current.push({
                ...segment,
                jerk: lastJerkRef.current,
                timestamp: Date.now(),
              });
            }
          }
          lastCoordRef.current = newPos;
        },
        (err) => console.error(err),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
      );
    };

    const interval = setInterval(() => {
      if (accelTriggered.current) {
        accelTriggered.current = false;
        pollGPSOnce();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [recording]);

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

  const toggleRecording = () => {
    if (!recording) {
      toast.info("Recording session started", {
        position: "top-left",
        autoClose: 1500,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        theme: "dark",
        style: { marginTop: "80px" },
      });
      recordedSession.current = [];
    } else {
      toast.success("Recording stopped. Check console.", {
        position: "top-left",
        autoClose: 1500,
        hideProgressBar: true,
        closeOnClick: true,
        pauseOnHover: false,
        draggable: false,
        theme: "dark",
        style: { marginTop: "80px" },
      });
      downloadJSON(recordedSession.current);
      console.log(
        "Recorded Session JSON:",
        JSON.stringify(recordedSession.current, null, 2)
      );
    }
    setRecording(!recording);
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
      <button
        className="record-btn"
        onClick={toggleRecording}
        title="Toggle recording"
      >
        {recording ? <FaStop /> : <FaPlay />}
      </button>
    </div>
  );
};

export default MapView;
