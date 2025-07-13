import React, { useRef, useEffect, useState } from "react";
import mapboxgl from "mapbox-gl";
import "../styles/Map.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const MapView = () => {
  const mapContainerRef = useRef(null);
  const [map, setMap] = useState(null);
  const [pathCoords, setPathCoords] = useState([]);
  const userMarkerRef = useRef(null);
  const watchIdRef = useRef(null);

  const vehicleIcon = {
    url: "/vehicle-icon.png",
    width: 40,
    height: 40,
  };

  useEffect(() => {
    const initializeMap = async (position) => {
      const { latitude, longitude } = position.coords;

      const mapInstance = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/dark-v11",
        center: [longitude, latitude],
        zoom: 16,
        pitch: 60,
        bearing: -20,
        antialias: true,
      });

      mapInstance.on("load", () => {
        mapInstance.addLayer({
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
        });

        const el = document.createElement("img");
        el.src = vehicleIcon.url;
        el.style.width = `${vehicleIcon.width}px`;
        el.style.height = `${vehicleIcon.height}px`;

        new mapboxgl.Marker(el)
          .setLngLat([longitude, latitude])
          .addTo(mapInstance);

        const blueDot = document.createElement("div");
        blueDot.style.width = "12px";
        blueDot.style.height = "12px";
        blueDot.style.borderRadius = "50%";
        blueDot.style.backgroundColor = "#00aaff";
        blueDot.style.border = "2px solid white";

        const userMarker = new mapboxgl.Marker(blueDot)
          .setLngLat([longitude, latitude])
          .addTo(mapInstance);

        userMarkerRef.current = userMarker;

        watchIdRef.current = navigator.geolocation.watchPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            setPathCoords((prev) => [...prev, [longitude, latitude]]);

            if (userMarkerRef.current) {
              userMarkerRef.current.setLngLat([longitude, latitude]);
            }

            if (mapInstance.getSource("path-line")) {
              mapInstance.getSource("path-line").setData({
                type: "Feature",
                geometry: {
                  type: "LineString",
                  coordinates: [...pathCoords, [longitude, latitude]],
                },
              });
            } else {
              mapInstance.addSource("path-line", {
                type: "geojson",
                data: {
                  type: "Feature",
                  geometry: {
                    type: "LineString",
                    coordinates: [[longitude, latitude]],
                  },
                },
              });

              mapInstance.addLayer({
                id: "path-line-layer",
                type: "line",
                source: "path-line",
                paint: {
                  "line-color": "#00aaff",
                  "line-width": 4,
                },
              });
            }
          },
          (err) => console.warn("Watch error:", err),
          { enableHighAccuracy: true, maximumAge: 1000, timeout: 5000 }
        );

        setMap(mapInstance);
      });

      mapInstance.addControl(new mapboxgl.NavigationControl(), "top-right");
    };

    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        initializeMap,
        (err) => alert("Geolocation error: " + err.message),
        { enableHighAccuracy: true }
      );

      return () => {
        if (watchIdRef.current !== null) {
          navigator.geolocation.clearWatch(watchIdRef.current);
        }
      };
    } else {
      alert("Geolocation not supported in your browser");
    }
  }, []);

  return <div className="map-container" ref={mapContainerRef} />;
};

export default MapView;
