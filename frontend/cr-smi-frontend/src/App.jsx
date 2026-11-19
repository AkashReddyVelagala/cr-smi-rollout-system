import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Provider } from "react-redux";
import { store } from "./store/store";
import AppLayout from "./components/layout/AppLayout";
import LoadDataPage from "./features/LoadDataPage";

const ScreenPlaceholder = ({ title }) => (
  <div className="app-card app-card-body text-center py-16">
    <h2 className="text-lg font-bold text-slate-800">{title}</h2>
    <p className="text-sm text-slate-500 mt-1">
      
    </p>
  </div>
);

export default function App() {
  return (
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route
              path="/dashboard"
              element={<ScreenPlaceholder title="Dashboard" />}
            />
            <Route
              path="/crs"
              element={<ScreenPlaceholder title="CR List" />}
            />
            <Route
              path="/planner"
              element={<ScreenPlaceholder title="Rollout Planner" />}
            />
            <Route
              path="/srs"
              element={<ScreenPlaceholder title="SR Tracking" />}
            />
            <Route path="/import" element={<LoadDataPage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </Provider>
  );
}
