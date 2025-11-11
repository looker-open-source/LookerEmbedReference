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

// This component wraps the menu button, Looker icon and page title together
// To modify the menu, pass a different 'routes' object in the App.js file
// To modify styles, edit the Image and Header constants here.

import React from 'react'
import { Space } from '@looker/components'
import styled from "styled-components"
import { MenuButton } from './MenuButton'

function TopBanner({setMenuToggle,menuToggle}) {
    return (
        <>
            <Space className='top-banner' paddingLeft="20px">
                <MenuButton setMenuToggle={setMenuToggle} menuToggle={menuToggle} />
                <Header>
                    Looker Embedded Reference Application
                </Header>
            </Space>
        </>
    )
}

const Image = styled.img`
  width: 100px;
  height: 27px;
  padding-left: 1 rem;
`
const Header = styled.h1`
  font-family: "Google Sans", "Open Sans", Arial, Helvetica, sans-serif;
  font-size: 26px;
  color: #5F6368;
  font-weight: 200;
  padding-bottom: -6px;
`

export default TopBanner
