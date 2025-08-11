import { Typography } from "antd";
import CodeEditor from "./components/CodeEditor";
import "./App.css";
const { Title } = Typography;
import { Link } from "react-router-dom";

function App() {
  return (
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
  );
}

export default App;
