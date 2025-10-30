import React, { useCallback } from "react"
import {Box} from "@looker/components"

export const Message = (message) => {
  return(
    <Box
      height="50px"
      width="100%"
      overflow="hidden"
    >
      {JSON.stringify(message)}
    </Box>
  )
}

export const UserMessage = (message) => { 
}

export const SchemaMessage = (message) => {

}

export const DataMessage = (message) => {

}

export const ChartMessage = (message) => {

}

