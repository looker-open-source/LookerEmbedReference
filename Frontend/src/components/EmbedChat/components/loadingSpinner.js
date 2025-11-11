import React from "react"
import { Span, Spinner } from "@looker/components"
import styled from "styled-components";

export const LoadingSpinner = () => (
  <LoadingContainer>
    <Spinner size={100} margin="auto"/>
    <Span>Loading past/creating new conversation</Span>
  </LoadingContainer>
)

const LoadingContainer = styled.div`
  text-align: center;
`;