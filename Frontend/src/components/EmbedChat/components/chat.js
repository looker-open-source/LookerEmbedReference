import React, { useCallback, useEffect, useState } from "react"
import {} from "@looker/components"
import styled from "styled-components";
import { ChatInput } from "./input"
import { MessageList } from "./messagelist"
import { JSONParser } from '@streamparser/json'

export const Chat = ({conversationId="887e9170-cc3f-4664-a4c0-0eb1e1d7af86"}) => {
  const [messages, setMessages] = useState([])
  const [inputDisabled, setInputDisabled] = useState(true)

  // Initial fetch of messages
  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch(`/api/messages/${conversationId}`)
      const data = await response.json()
      data.messages.reverse()
      setMessages(data.messages)
      setInputDisabled(false)
    }
    if (conversationId) {
      fetchMessages()
    }
  }, [])

  // Send user prompt and stream conversational analytics response
  const handleSubmit = value => {
    const sendMessageAndStreamResponse = async() => {
      setInputDisabled(true)

      const response = await fetch(`/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: conversationId,
          message: value,
        })
      })

      if (response.ok) {
        const streamParser = new JSONParser();
        streamParser.onValue = ({ value }) => {
          // CA API Bug: Does not return messageId for prompt responses
          if (Object.hasOwn(value, "timestamp")) {
            // Use an updater function or else will append to initial message
            // state. https://react.dev/learn/queueing-a-series-of-state-updates
            setMessages(messages => [...messages, value])
          }
        };

        for await (const chunk of response.body) {
          streamParser.write(chunk);
        }
      }
      setInputDisabled(false)
    }

    sendMessageAndStreamResponse()
  }

  return (
    <ChatContainer>
      <MessageList messages={messages}/>
      <ChatInput onSubmit={handleSubmit} disabled={inputDisabled}/>
    </ChatContainer>
  )
}

const ChatContainer = styled.div`
  width: 25%;
  height: 100%;
`;
