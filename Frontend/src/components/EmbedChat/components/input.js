import React, { useCallback, useState } from "react"
import { InputText, Button, Box } from "@looker/components"
import styled from "styled-components"

export const ChatInput = ({onSubmit=() => {}, disabled=false}) => {
  const [inputValue, setInputValue] = useState("")

  const handleSubmit = () => {
    onSubmit(inputValue)
    setInputValue("")
  }

  return (
    <Box
      height="40px"
      width="100%"
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
      >
        Submit
      </Button>
    </Box>
  )

}


