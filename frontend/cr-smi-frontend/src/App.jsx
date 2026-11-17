import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import AppLayout from "./components/layout/AppLayout";

const ScreenPlaceholder = ({ title }) => (
  <div className="app-card app-card-body text-center py-16">
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    <p className="text-sm text-slate-500 mt-1">
      Shell ready — ready for screen implementation.
    </p>
  </div>
);

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/import" replace />} />
            <Route
              path="/dashboard"
              element={<ScreenPlaceholder title="Screen 1: Dashboard" />}
            />
            <Route
              path="/crs"
              element={<ScreenPlaceholder title="Screen 2: CR List" />}
            />
            <Route
              path="/planner"
              element={<ScreenPlaceholder title="Screen 3: Rollout Planner" />}
            />
            <Route
              path="/srs"
              element={<ScreenPlaceholder title="Screen 4: SR Tracking" />}
            />
            <Route
              path="/import"
              element={<ScreenPlaceholder title="Screen 5: Load Data" />}
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
