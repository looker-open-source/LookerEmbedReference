import React, { useCallback } from "react"
import { Box } from "@looker/components"
import { Message } from "./message"

export const MessageList = ({messages = []}) => {
  const list = messages.map(m => 
    // CA API Bug: No messageId for immediate prompt responses
    // So we must set messageId ourselves for the session
    <Message
      key={m.messageId ? m.messageId : crypto.randomUUID()}
      message={m}
    />
  )
  return(
    <Box
      height="calc(100% - 40px)"
      width="100%"
      overflow="scroll"
    >
      {list}
    </Box>
  )
}

