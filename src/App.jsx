import { useState } from "react";
import Header from "./components/Header";
import MapView from "./components/MapView";
import { MotionContext } from "./context/MotionContext";
// import "./styles/App.css";

function App() {
  const [motion, setMotion] = useState(null);

  return (
    <MotionContext.Provider value={{ motion }}>
      <div className="app-container">
        <Header />
        <MapView onMotionDetected={setMotion} />
      </div>
    </MotionContext.Provider>
  );
}

export default App;
