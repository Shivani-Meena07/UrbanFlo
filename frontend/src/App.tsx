import { AppProvider } from "./state/AppContext";
import FloodNavScreen from "./screens/navigation/FloodNavScreen";

/* =====================================================
   UrbanFlo - FLOOD-AWARE SAFE NAVIGATION
   Direct Google Maps style experience with zero clutter.
   ===================================================== */

function App() {
  return (
    <AppProvider>
      <FloodNavScreen />
    </AppProvider>
  );
}

export default App;