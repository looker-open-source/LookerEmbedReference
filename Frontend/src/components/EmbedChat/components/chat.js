import React, { useEffect, useState, Fragment } from "react"
import { Button, ButtonOutline, Space, SpaceVertical, FieldToggleSwitch } from "@looker/components"
import styled from "styled-components";
import { ChatInput } from "./input"
import { MessageList } from "./messagelist"
import { LoadingSpinner } from "./loadingSpinner"
import { JSONParser } from '@streamparser/json';

const COOKIE_NAME = "conversation-id"

const FIELD_FILTER_MAP = {
  "state.state_name": "State 📍",
  "county.county_name": "County Name",
}

export const Chat = ({ currentFilters = {}, setFilters = ()=>{} }) => {
  // Messages to show in chat
  const [messages, setMessages] = useState([])
  const [conversationId, setConversationId] = useState("")
  const [inputDisabled, setInputDisabled] = useState(false)
  const [isLoading, setIsLoading ] = useState(true)
  const [chatFilterToggle, setChatFilterToggle] = useState(true)
  const [dashFilterToggle, setDashFilterToggle] = useState(true)

  // On component load fetch previous conversation id or create new conversation
  useEffect(() => {(async () => {
      const idCookie = await cookieStore.get(COOKIE_NAME)
      if (idCookie?.value){
        setConversationId(idCookie.value)
      } else {
        createSetConversation()
      }
    })()
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
  useEffect(() => {(async () => {
      const response = await fetch(`/api/messages/${conversationId}`)
      const messages = await response.json()
      messages.reverse()
      setMessages(messages)
      setIsLoading(false)
    }
    )()
  }, [conversationId])


  // Send user prompt and stream conversational analytics response
  const handleSubmit = userInput => {(async() => {
      setInputDisabled(true)
      const response = await showAndSendUserPrompt(userInput) 
      if (response.ok) {
        await streamAndParseResponse(response)
      }
      setInputDisabled(false)
    })()
  }

  // Add the dashboard's filters the user prompt (if any). Then send the user prompt to CA API.
  const showAndSendUserPrompt = (userInput) => {
    let userPrompt = userInput
    // Translates dashboard filters to prompt with the format: "Filter on dimension 'state.state_name' being Alaska or California."
    if (dashFilterToggle) {
      Object.entries(FIELD_FILTER_MAP).forEach(([fieldName, filterName])=> {
        if (currentFilters[filterName]) {
          const filterValues = currentFilters[filterName].split(",") 
          userPrompt += ` Filter on dimension '${fieldName}' being ${filterValues.join(" or ")}. `  
        }
      })
    }

    // Display the user's prompt in the chat
    setMessages(messages => [...messages, {
      kind: "userMessage",
      timestamp: {
        seconds: Math.floor(Date.now() / 1000),
        nano: 0
      },
      userMessage: { text: userPrompt} 
    }])

    // Send the user's prompt to CA API
    return fetch(`/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversationId: conversationId,
        message: userPrompt,
      })
    })
  }

  // Streams the response from the CA API. Parses the response into system messages. Filters the dashboard on any data system messages recieved from the CA API.
  const streamAndParseResponse = async (response) => {
    // We use the JSONParser library to parse the streamed response into system messages we can display in chat
    const jsonStreamParser = new JSONParser({ separator: '' });
    // onValue() fires on any parseable JSON
    jsonStreamParser.onValue = ({ value, key }) => {
      // Only continue with top level CA API system messages
      if (key === undefined) {
        // Use an updater function or else will append to initial message
        // state. https://react.dev/learn/queueing-a-series-of-state-updates
        setMessages(messages => [...messages, value])
        
        // If we've recieved a CA API data message, filter the dashboard on the data received, and notify chat
        const data = value?.systemMessage?.data?.result?.data
        if (chatFilterToggle && data) {
          setFilters(convertDataToFilters(data))

          const systemFilterMessage = {
            timestamp: {
              seconds: Math.floor(Date.now() / 1000),
              nano: 0
            },
            systemMessage: {
              text: {
                parts: ["I have filtered your embedded Looker dashboard based on the data retrieved"]
              }
            }
          }

          setMessages(messages => [...messages, systemFilterMessage])
        }
      }
    };

    // Keep reading and parsing the streamed response until the response ends.
    for await (const messageBytes of response.body) {
      try {
        jsonStreamParser.write(messageBytes)
      } catch(e) {
        console.log("JSON stream parser error:", e)
      }
    }
  }
      
  // Converts a CA API data rows to dashboard filters. Example row of data:
  // {
  //   "fields": {
  //     "state.state_name": {
  //       "stringValue": "California",
  //       "kind": "stringValue"
  //     }
  //   }
  // }
  // Would be converted to these dashboard filters:
  // {
  //   "State 📍": "Texas,Alabama",
  //   "County Name": "",
  // }
  // We will preserve any existing filters (if not empty)
  const convertDataToFilters = (data) => {
    const filters = {}

    Object.entries(FIELD_FILTER_MAP).forEach(([_, filterName]) => {
      filters[filterName] = []
    })

    data.forEach(row => {
      for (const columnName in row.fields) {
        if (columnName in FIELD_FILTER_MAP) {
          const value = row.fields[columnName][row.fields[columnName].kind]
          filters[FIELD_FILTER_MAP[columnName]].push(value)
        }
      }
    })

    for (const filterName in filters) {
      if (filters[filterName].length > 0) {
        filters[filterName] = filters[filterName].join(",")
      } else {
        filters[filterName] = currentFilters[filterName]
      }
    }

    return filters
  }

  return (
    <ChatContainer>
      {isLoading ? (
        <LoadingSpinner/>
      ) : (
        <Fragment>
          <MessageList messages={messages}/>
          <ChatInput onSubmit={handleSubmit} disabled={inputDisabled}/>
          <Space>
            <SpaceVertical gap="none">
              <FieldToggleSwitch 
                label="Submit with dashboard filters"
                on={dashFilterToggle}
                onChange={e => setDashFilterToggle(e.target.checked)}
              />
              <FieldToggleSwitch
                label="Allow chat to filter dashboard"
                on={chatFilterToggle}
                onChange={e => setChatFilterToggle(e.target.checked)}
              />
            </SpaceVertical>
            <ButtonOutline onClick={createSetConversation}>
              New Conversation
            </ButtonOutline> 
          </Space>
        </Fragment>
      )}
    </ChatContainer>
  )
}

const ChatContainer = styled.div`
  width: 25%;
  height: 100%;
  padding-right: 1rem;
`;
