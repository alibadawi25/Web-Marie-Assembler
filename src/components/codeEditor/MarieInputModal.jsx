import { Button, Dropdown, Input, Modal, Typography } from "antd";

import { INPUT_TYPE_ITEMS } from "./constants.js";
import { isInputValueInvalid } from "./utils.js";

const { Title } = Typography;

export default function MarieInputModal({
  open,
  inputType,
  inputValue,
  onInputTypeChange,
  onInputValueChange,
  onConfirm,
}) {
  const inputTypeMenu = {
    items: INPUT_TYPE_ITEMS,
    onClick: ({ key }) => onInputTypeChange(key),
  };

  return (
    <Modal
      open={open}
      closable={false}
      footer={
        <Button
          className="run-assemble-button"
          onClick={onConfirm}
          disabled={isInputValueInvalid(inputType, inputValue)}
        >
          OK
        </Button>
      }
    >
      <Title level={4}>MARIE Input</Title>
      <Dropdown menu={inputTypeMenu}>
        <Button>{inputType.toUpperCase()}</Button>
      </Dropdown>
      <Input
        value={inputValue}
        onChange={(event) => onInputValueChange(event.target.value)}
        placeholder={
          inputType === "unicode"
            ? "Enter a single character"
            : `Enter a ${inputType} number`
        }
        type="text"
        maxLength={inputType === "unicode" ? 1 : undefined}
        className="input-field"
      />
    </Modal>
  );
}
