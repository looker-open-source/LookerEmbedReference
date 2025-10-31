import React, { useCallback, useEffect, useState, Fragment } from "react"
import { Button, Spinner } from "@looker/components"
import styled from "styled-components";
import { ChatInput } from "./input"
import { MessageList } from "./messagelist"
import { JSONParser } from '@streamparser/json'

const COOKIE_NAME = "conversation-id"

export const Chat = () => {
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState("")
  const [inputDisabled, setInputDisabled] = useState(false)
  const [isLoading, setIsLoading ] = useState(true)

  // On component load fetch previous conversation id or create new conversation
  useEffect(() => {
    const init = async () => {
      const idCookie = await cookieStore.get(COOKIE_NAME)
      if (idCookie?.value){
        setConversationId(idCookie.value)
      } else {
        createSetConversation()
      }
    }
    init()
  }, [])

  // Create new conversation and set its id in cookie
  const createSetConversation = async () => {
    setIsLoading(true)
    const response = await fetch("/api/conversations", {method: "POST"})
    const id = await response.text()
    cookieStore.set(COOKIE_NAME, id) 
    setConversationId(id)
  }

  // Fetch messages on conversation id change
  useEffect(() => {
    const fetchMessages = async () => {
      const response = await fetch(`/api/messages/${conversationId}`)
      const data = await response.json()
      // CA API Bug: "messages" prop not defined if new convo
      if (data.messages) {
        data.messages.reverse()
        setMessages(data.messages.map(m => m.message))
      } else {
        setMessages([])
      }
      setIsLoading(false)
    }
    fetchMessages()
  }, [conversationId])

  // Send user prompt and stream conversational analytics response
  const handleSubmit = value => {
    const sendMessageAndStreamResponse = async() => {
      setInputDisabled(true)

      setMessages(messages => [...messages, {
        timestamp: new Date().toISOString(),
        userMessage: {
          text: value,
        } 
      }])

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
      <Button onClick={createSetConversation}>
          New Conversation
      </Button>
      {isLoading ? (
        <Spinner/>
      ) : (
        <Fragment>
          <MessageList messages={messages}/>
          <ChatInput onSubmit={handleSubmit} disabled={inputDisabled}/>
        </Fragment>
      )}
    </ChatContainer>
  )
}

const ChatContainer = styled.div`
  width: 25%;
  height: 100%;
`;
