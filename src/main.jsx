import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { App as AntApp, ConfigProvider } from "antd";

const TutorialPage = lazy(() => import("./pages/TutorialPage.jsx"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#54b0f8",
          colorText: "#d8e4f0",
          colorBgBase: "#0c1220",
          colorBgContainer: "#101828",
          colorBorder: "#1e2e47",
          colorBgElevated: "#15202e",
          borderRadius: 6,
          fontFamily: "'IBM Plex Sans', system-ui, sans-serif",
        },
      }}
    >
      <AntApp>
        <BrowserRouter>
          <Suspense fallback={null}>
            <Routes>
              <Route path="/" element={<App />} />
              <Route path="/tutorial" element={<TutorialPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>
);
