import { StrictMode, Suspense, lazy } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "antd";

const TutorialPage = lazy(() => import("./pages/TutorialPage.jsx"));

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: "#1890ff",
          colorText: "#ffffff",
          colorBgBase: "#242424",
          colorBgContainer: "#1f1f1f",
          colorBorder: "#434343",
        },
      }}
    >
      <BrowserRouter>
        <Suspense fallback={null}>
          <Routes>
            <Route path="/" element={<App />} />
            <Route path="/tutorial" element={<TutorialPage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>
);
