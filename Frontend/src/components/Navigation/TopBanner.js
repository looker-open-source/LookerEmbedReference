// Copyright 2022-2026 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
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
import { ButtonOutline, Space } from '@looker/components'
import { MenuButton } from './MenuButton'

function TopBanner({ setMenuToggle, menuToggle, currentUser, onLogout }) {
    return (
        <>
            <Space className='top-banner' paddingLeft="20px" justify="between">
                <Space>
                    {setMenuToggle && (
                        <MenuButton setMenuToggle={setMenuToggle} menuToggle={menuToggle} />
                    )}
                    <img className="top-banner-image" src="https://looker.com/assets/img/images/logos/looker.svg" alt="Looker" />
                    <h1 className="top-banner-header text-header-style">Embedded Reference Application </h1>
                </Space>
                {currentUser && onLogout && (
                    <Space width="auto" pr="medium">
                        <span className="text-header-style" style={{ fontSize: '0.875rem' }}>
                            Signed in as <strong>{currentUser}</strong>
                        </span>
                        <ButtonOutline size="small" onClick={onLogout}>
                            Sign out
                        </ButtonOutline>
                    </Space>
                )}
            </Space>
        </>
    )
}

export default TopBanner
