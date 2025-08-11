import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import TutorialPage from "./pages/TutorialPage.jsx";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ConfigProvider } from "antd";

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
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/tutorial" element={<TutorialPage />} />
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  </StrictMode>
);
