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

import React, { ReactNode, useEffect } from 'react'
import { Drawer, IconButton, close } from '@looker/components';
import { Close } from '@styled-icons/material-outlined';

import EmbedDashboard from '../EmbedDashboard/EmbedDashboard.js?raw';
import EmbedDashboardWFilters from '../EmbedDashboardWFilters/EmbedDashboardWFilters.js?raw';
import EmbedExplore from '../EmbedExplore/EmbedExplore.js?raw';

import EmbedQuery from '../EmbedQuery/EmbedQuery.js?raw';
import VizComponent from '../VizComponent/VizComponent.js?raw';
import VizComponentWFilter from '../VizComponent/VizComponentWFilter.js?raw';
import EmbedDashboardEvents from '../EmbedDashboardEvents/EmbedDashboardEvents.js?raw';
import EmbedTwoIframes from '../EmbedTwoIframes/EmbedTwoIframes.js?raw';
import EmbedDashboardLayout from '../EmbedDashboardLayout/EmbedDashboardLayout.js?raw';
import EmbedDashboardDownload from '../EmbedDashboardDownload/EmbedDashboardDownload.js?raw';
import SSOUrlTester from '../SSOUrlTester/SSOUrlTester.js?raw';

import SyntaxHighlighter from 'react-syntax-highlighter';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

const codeSnippets = {
    EmbedDashboard,
    EmbedDashboardWFilters,
    EmbedExplore,
    EmbedQuery,
    VizComponent,
    VizComponentWFilter,
    EmbedDashboardEvents,
    EmbedTwoIframes,
    EmbedDashboardLayout,
    EmbedDashboardDownload,
    SSOUrlTester
}


export default function CodeDrawer({ content, path, drawerToggle, setDrawerToggle }) {
    const [iframeData, setIframeData] = React.useState('');

    const code = codeSnippets[path]

    return (
        <Drawer width={800} isOpen={drawerToggle} content={
            <>
                <IconButton onClick={() => setDrawerToggle(false)} icon={<Close />} size="large" />
                <SyntaxHighlighter wrapLines={true} language="javascript" style={docco}>
                    {code}
                </SyntaxHighlighter>
            </>
        } />
    )

}