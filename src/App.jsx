import { ConfigProvider, Typography } from "antd";
import CodeEditor from "./components/CodeEditor";
import "./App.css"; // Ensure this file is imported for styles
const { Title } = Typography;

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
        <CodeEditor />
      </div>
    </ConfigProvider>
  );
}

export default App;
