import { useEffect, useRef } from "react"
import { Box } from "@looker/components"
import { Message } from "./message"

export const MessageList = ({messages = []}) => {
  // We use useEffect and useRef to autoscroll to the bottom of the list 
  // by scrolling to a persistent dummy message at the end.
  const dummyEndMessageRef = useRef(null)
  useEffect(() => {
    dummyEndMessageRef.current.scrollIntoView({ behavior: "smooth" })
  })

  const list = messages.map(m => 
    <Message
      key={m.timestamp.seconds + m.timestamp.nano}
      message={m}
    />
  )
  return(
    <Box
      height="calc(100% - 85px)"
      overflow="scroll"
      border="1px solid lightgray"
      borderRadius="4px"
    >
      {list}
      <div ref={dummyEndMessageRef}/>
    </Box>
  )
}

