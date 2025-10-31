import React, { useCallback } from "react"
import {Card, CardContent, Heading, Icon, Space} from "@looker/components"

const THINKING_FACE_EMOJI = String.fromCodePoint("0x1F914")
const ROBOT_EMOJI = String.fromCodePoint("0x1F916")

export const Message = ({ message }) => {
  if (Object.hasOwn(message, "userMessage")) {
    return <UserMessage userMessage={message.userMessage}/>
  } else if (Object.hasOwn(message, "systemMessage")){
    if (Object.hasOwn(message.systemMessage, "text")) {
      return <TextMessage systemMessage={message.systemMessage}/>
    } else if (Object.hasOwn(message.systemMessage, "error")) {
      return <ErrorMessage systemMessage={message.systemMessage}/>
    } else if (Object.hasOwn(message.systemMessage, "schema")) {
      return <SchemaMessage systemMessage={message.systemMessage}/>
    } else if (Object.hasOwn(message.systemMessage, "data")) {
      return <DataMessage systemMessage={message.systemMessage}/>
    } else if (Object.hasOwn(message.systemMessage, "chart")) {
      return <ChartMessage systemMessage={message.systemMessage}/>
    } 
  } else {
    return null
  }
}

const MessageContainer = ({isUser=false, title, children}) => {
  return (
    <Card
      raised
      height="fit-content"
      width="100%"
      overflow="scroll"
    >
      <CardContent>
        <Heading 
          fontSize="large"
          text-align={isUser ? "left" : "right"}
        >
          {isUser ? THINKING_FACE_EMOJI : ROBOT_EMOJI}: {title}
        </Heading>
        {children}
      </CardContent>
    </Card>
  )
}

const UserMessage = ({ userMessage }) => {
  return(
    <MessageContainer 
      isUser={true}
      title={"Prompt"}
    >
      {userMessage.text}
    </MessageContainer>
  )
}

const ErrorMessage = ({ systemMessage }) => {
  return(
    <MessageContainer 
      title={"System error"}
    >
      System error: {systemMessage.text}
    </MessageContainer>
  )
}

const TextMessage = ({ systemMessage }) => {
  return(
    <MessageContainer 
      title={"System text"}
    >
      System text: {systemMessage.text.parts.join()}
    </MessageContainer>
  )  
}

const SchemaMessage = ({ systemMessage }) => {
  return(
    <MessageContainer 
      title={"System schema"}
    >
      
    </MessageContainer>
  )
}

const DataMessage = ({ systemMessage }) => {
    <MessageContainer 
      title={"System data"}
    >
    </MessageContainer>

}

const ChartMessage = ({ systemMessage }) => {
    <MessageContainer 
      title={"System chart"}
    >
    </MessageContainer>
}

