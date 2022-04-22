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

import React, {ReactNode, useEffect} from 'react'
import { Drawer, IconButton, close } from '@looker/components';
import { Close } from '@styled-icons/material-outlined';

export default function CodeDrawer({content, path, drawerToggle, setDrawerToggle}) {
    const [iframeData, setIframeData] = React.useState('');
    useEffect(() => {
        const url = 'https://api.github.com/repos/bytecodeio/LookerEmbeddedReference-Frontend/contents/src/components/'+path;
        //fetch('https://api.github.com/repos/aaronmodic/jsonplaceholder/contents/db.json')
        fetch(url)
        .then((res) => res.json())
        .then((ghContent) => {
            const decodedString = 'data:text/javascript;base64,'+ghContent['content'];
            setIframeData(decodedString);
        }) 
    },[content])

    return(
        <Drawer width={800} isOpen={drawerToggle} content={
            <>
                <IconButton onClick={() => setDrawerToggle(false)} icon={<Close />} size="large" />
                <iframe frameBorder={0} width={'100%'} height={'100%'} src={iframeData}></iframe>
            </>
        } />          
    )
}