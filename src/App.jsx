import { ConfigProvider, Typography } from "antd";
import CodeEditor from "./components/CodeEditor";
import "./App.css"; // Ensure this file is imported for styles
const { Title } = Typography;

import { Link } from "react-router-dom";

function App() {
  return (
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
      <div className="App">
        <Title level={1}>MARIE Assembler</Title>
        <Link
          to="/tutorial"
          style={{
            color: "#1890ff",
            marginBottom: 16,
            display: "inline-block",
          }}
        >
          Tutorial
        </Link>
        <CodeEditor />
      </div>
    </ConfigProvider>
  );
}

export default App;
