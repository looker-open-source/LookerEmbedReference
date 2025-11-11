import React, { useCallback, useState } from "react"
import { InputText, Button, Space, Spinner } from "@looker/components"

export const ChatInput = ({onSubmit=() => {}, disabled=false}) => {
  const [inputValue, setInputValue] = useState("")

  const handleSubmit = () => {
    onSubmit(inputValue)
    setInputValue("")
  }

  return (
    <Space
      height="40px"
      width="100%"
      between
    >
      <InputText 
        disabled={disabled}
        placeholder={disabled ? "Thinking..." : "Ask your data questions!"}
        value={inputValue}
        onChange={e => setInputValue(e.target.value)}
        onKeyPress={e => { if (e.key === 'Enter') handleSubmit() }}
        width="80%"
      />
      <Button
        width="20%"
        onClick={handleSubmit}
        disabled={disabled}
      >
        {disabled ? (
          <Spinner color="white" />
        ) : (
          "Submit"
        )}
      </Button>
    </Space>
  )
}


