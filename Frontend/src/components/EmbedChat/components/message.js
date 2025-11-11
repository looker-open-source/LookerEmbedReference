import React, { Fragment } from "react"
import {Box, Card, CardContent, Heading, Table, TableHead, TableBody, TableRow, TableHeaderCell, TableDataCell, Drawer, ButtonOutline, Paragraph, Space} from "@looker/components"
import Markdown from 'react-markdown'

const THINKING_FACE_EMOJI = String.fromCodePoint("0x1F914")
const ROBOT_EMOJI = String.fromCodePoint("0x1F916")

export const Message = ({ message }) => {
  if ("userMessage" in message) {
    return <UserMessage userMessage={message.userMessage}/>
  } else if ("systemMessage" in message) {
    if ("text" in message.systemMessage) {
      return <TextMessage text={message.systemMessage.text}/>
    } else if ("error" in message.systemMessage) {
      return <ErrorMessage error={message.systemMessage.error}/>
    } else if ("schema" in message.systemMessage) {
      if ("query" in message.systemMessage.schema) {
        return <SchemaQueryMessage query={message.systemMessage.schema.query}/>
      } else if ("result" in message.systemMessage.schema) {
        return <SchemaResultMessage result={message.systemMessage.schema.result} />
      }
    } else if ("data" in message.systemMessage) {
      if ("query" in message.systemMessage.data) {
        return <DataQueryMessage query={message.systemMessage.data.query}/>
      } else if ("result" in message.systemMessage.data) {
        return <DataResultMessage result={message.systemMessage.data.result} />
      }
    } else if ("chart" in message.systemMessage) {
      if ("query" in message.systemMessage.chart) {
        return <ChartQueryMessage query={message.systemMessage.chart.query}/>
      } else if ("result" in message.systemMessage.chart) {
        return <ChartResultMessage result={message.systemMessage.chart.result} />
      }
    }
  }
  console.log("Unrecognized message:", message)
  return null
}

const MessageContainer = ({isUser=false, title, children}) => (
  <Card
    raised
    height="fit-content"
    overflow="scroll"
    margin="5px 5px 5px 5px"
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

const UserMessage = ({ userMessage }) => (
  <MessageContainer 
    isUser={true}
    title={"Prompt"}
  >
    {userMessage.text}
  </MessageContainer>
)

const ErrorMessage = ({ error }) => (
  <MessageContainer title={"System error"}>
    {error}
  </MessageContainer>
)

const TextMessage = ({ text }) => (
  <MessageContainer title={"System reply"}>
    <Markdown>{text.parts.join()}</Markdown>
  </MessageContainer>
)  

const SchemaQueryMessage = ({ query }) => {
  return(
    <MessageContainer title={"Retrieval query"}> 
      {query.question}
    </MessageContainer>
  )
}

const SchemaResultMessage = ({ result  }) => {
  return(
    <MessageContainer title={"Schema resolved"}> 
      <Heading>Data sources:</Heading>
      <DataSources dataSources={result.datasources}/>
    </MessageContainer>
  )
}

const DataSources = ({ dataSources }) => {
  return (
    <Fragment>
      {dataSources.map((d,i) => (
        <DataSource key={i} dataSource={d}/>
      ))}
    </Fragment>
  )
}

const DataSource = ({ dataSource }) => {
  const drawerContent = (
    <Box overflow="scroll" padding="5px 5px 5px 5px">
      <Heading>
        Metadata
      </Heading>
      <Table> 
        <TableBody>
          <TableRow>
            <TableDataCell>Explore</TableDataCell>
            <TableDataCell>Model</TableDataCell>
            <TableDataCell>Instance</TableDataCell>
          </TableRow>
          <TableRow>
            <TableDataCell>{dataSource.lookerExploreReference.explore}</TableDataCell>
            <TableDataCell>{dataSource.lookerExploreReference.lookmlModel}</TableDataCell>
            <TableDataCell>{dataSource.lookerExploreReference.lookerInstanceUri}</TableDataCell>
          </TableRow>
        </TableBody>
      </Table> 
      <Heading>
        Fields
      </Heading>
      <Table> 
        <TableHead>
          <TableRow>
            <TableHeaderCell>Name</TableHeaderCell>
            <TableHeaderCell>Type</TableHeaderCell>
            <TableHeaderCell>Description</TableHeaderCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {dataSource.schema.fields.map(f => (
            <TableRow key={`${f.name}${f.type}`}>
              <TableDataCell>{f.name}</TableDataCell>
              <TableDataCell>{f.type}</TableDataCell>
              <TableDataCell>{f.description}</TableDataCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )
  return(
    <Drawer 
      content={drawerContent}
      width="50rem"
    >
      <ButtonOutline>
        {dataSource.lookerExploreReference.explore}
      </ButtonOutline>
    </Drawer>
     
  )
}

const DataQueryMessage = ({ query }) => {
  return(
    <MessageContainer title={"Retrieval query"}> 
      <Heading>Query name:</Heading>
      <Paragraph>{query.name}</Paragraph>
      <Heading>Question:</Heading>
      <Paragraph>{query.question}</Paragraph>
      <Heading>Data sources:</Heading>
      <DataSources dataSources={query.datasources}/>
    </MessageContainer>
  )
}

const DataResultMessage = ({ result }) => {
  const fieldNames = result.schema.fields.map(f => f.name)
  const drawerContent = (
    <Box overflow="scroll" padding="5px 5px 5px 5px">
      <Table> 
        <TableHead>
          <TableRow>
            {fieldNames.map(n => (
              <TableHeaderCell key={n}>{n}</TableHeaderCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {result.data.map((row, i) => (
            <TableRow key={i}>
              {fieldNames.map(n => {
                const valueProperty = row.fields[n].kind
                return (
                  <TableDataCell key={`${n}${valueProperty}`}>
                    {row.fields[n][valueProperty]}
                  </TableDataCell> 
                )
              })}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  )

  return(
    <MessageContainer title={"Data retrieved"}>
      <Drawer content={drawerContent}>
        <ButtonOutline>
          Data table
        </ButtonOutline>
      </Drawer>
    </MessageContainer>
  )
}

const ChartQueryMessage = ({ query }) => (
  <MessageContainer title={"Chart instructions"}>
    {query.instructions}
  </MessageContainer>
)

const ChartResultMessage = ({ result }) => {
  const decoder = new TextDecoder()
  const svgXMLString = decoder.decode(new Uint8Array(result.image.data.data))

  return(
    <MessageContainer title={"Visualization"}>
      <img src={`data:image/svg+xml;utf8,${encodeURIComponent(svgXMLString)}`}/>
    </MessageContainer>
  )
}

