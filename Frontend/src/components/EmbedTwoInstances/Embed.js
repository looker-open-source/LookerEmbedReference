// Copyright 2022 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React, { useCallback }  from 'react'
import styled from "styled-components"
//Alias an additional import of the embed sdk
import { LookerEmbedSDK, LookerEmbedSDK as LookerEmbedSDK2 } from '@looker/embed-sdk'

const Embed = () => {
  const makeDashboard = useCallback((el) => {
    if (el) {
      el.innerHTML = ''
    LookerEmbedSDK.init(
      process.env.LOOKERSDK_EMBED_HOST, 
      { 
        url: '/api/auth' 
       ,headers: [
           { name: 'usertoken', value: 'user2' }
           //Pass a value to your backend service to indicate which host to form a URL for
           ,{ name: 'host', value: 'host1' }
        ]
      }
      )
    LookerEmbedSDK.createDashboardWithId(20)
    .appendTo(el)
    .on('dashboard:loaded',(e)=>{console.log('LookerEmbedSDK.createDashboardWithId()::Successfully Loaded!');})
    .build()
    .connect()
    .catch((error) => {
      console.error('An unexpected error occurred', error)
    })
  }
}, [])

const makeDashboard2 = useCallback((el) => {
  if (el) {
    el.innerHTML = ''
  LookerEmbedSDK2.init(
    process.env.LOOKERSDK_EMBED_HOST, 
    { 
      url: '/api/auth' 
     ,headers: [
         { name: 'usertoken', value: 'user1' }
         //Pass a value to your backend service to indicate which host to form a URL for
         ,{ name: 'host', value: 'host2' }
      ]
    }
    )
  LookerEmbedSDK2.createDashboardWithId(1)
  .appendTo(el)
  .on('dashboard:loaded',(e)=>{console.log('LookerEmbedSDK2.createDashboardWithId()::Successfully Loaded!');})
  .build()
  .connect()
  .catch((error) => {
    console.error('An unexpected error occurred', error)
  })
}
}, [])
  return (
    <>
          <Dashboard ref={makeDashboard}></Dashboard>
          <Dashboard ref={makeDashboard2}></Dashboard>
    </>
  )
}

const Dashboard = styled.div`
  width: 100%;
  height: 95vh;
  & > iframe {
    width: 100%;
    height: 100%;
  }
` 
export default Embed