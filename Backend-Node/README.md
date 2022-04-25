[<img src="https://looker.com/assets/img/images/logos/looker.svg" alt="Looker" width="200"/>](https://www.looker.com)

# Embed Reference - Node Backend

This application is the backend / server component supporting the [reference implementation library](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend) of examples for building Embedded [Looker](https://www.looker.com) Solutions.  

This [Node](https://nodejs.org) application uses the [Looker API](https://docs.looker.com/reference/api-and-integration) to provide embed urls to the user-facing React [application.](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend)

There is a [Java backend example](https://github.com/bytecodeio/LookerEmbeddedReference-Backend-Java) of this application as well.

## About Embedding Looker
---
Embedding Looker involves displaying and interacting with Looker content from an outside source, such as the users website or in a third party SAS solution from another vendor. This offers a way to seemlessly leverage the power of Looker to enhance a third party product and / or offer a secure method for an outside user to interact with the data provided. 

For more please see the documentation for the [Front End](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend#about-embedding-looker) component.


## Prerequisites
---
There are two methods of running this application; locally or on [GCP AppEngine.](https://cloud.google.com/appengine) 

* [Node.](https://nodejs.org)
* [Yarn](https://yarnpkg.com) package manager.
* A valid Looker API Key created from [User Admin.](https://docs.looker.com/admin-options/settings/users#api3_keys)

## Installation (local)
---

* Clone or download a copy of this repo to your development machine.
* Navigate (cd) to the template directory on your system.
* Install the dependencies with [Yarn.](https://yarnpkg.com/)

```
  yarn install
```
Verify the version of Node on the host. Node version 16.14.2 LTS tested.  


### Environmental variables
---

These can be set in an .env file ([example](dot-env-example)) or in the environment directly in the terminal/command line using:  ```export envir_var=value```

Note: .env file should be saved at the root: ./Backend-Node/.env

```
PBL_PORT=3000
LOOKERSDK_API_VERSION=4.0
LOOKERSDK_BASE_URL=https://[INSTANCE].looker.com
LOOKERSDK_CLIENT_ID=[CLIENT_ID]
LOOKERSDK_CLIENT_SECRET=[CLIENT_SECRET]

# No protocol for this host. Do not include http/https in the LOOKERSDK_EMBED_HOST url
LOOKERSDK_EMBED_HOST=[INSTANCE].looker.com
LOOKERSDK_EMBED_SECRET=[EMBED_SECRET]
```

LOOKERSDK_CLIENT_ID and LOOKERSDK_CLIENT_SECRET values are API Keys that can be found, or created, from the Looker menu:  *Admin -> Users -> Edit Users.*  These are specific to an individual user.  Please see [link](https://connect.looker.com/library/document/users?version=22.0#users_page).

LOOKERSDK_EMBED_SECRET is an instance-wide *Embed Secret* key that can be set from the Looker menu: *Admin -> Platform -> Embed*  
Here you can find *Embed Secret* and *Reset Secret*  
<b>NOTE:</b> "Reset Secret" will expire other SSO links or otherwise block access to all processes using the previous *Embed Secret.*  Please see [link](https://docs.looker.com/admin-options/platform/embed).  


### Looker Authenticated User / Model Configuration  
--- 

### config.js  

This file contains the configured user(s) and their attributes used with SSO embedding including:
  - external_group_id
  - group_ids
  - permissions
  - models
  - etc.   

More info regarding these settings and attributes can be found [here.](https://docs.looker.com/reference/embedding/sso-embed)

### Start the Server
---

Dev mode:
```
yarn dev  
```
Production mode:
``` 
yarn start
```

## Google AppEngine Installation (optional)  
  ---  
  Google [AppEngine](https://cloud.google.com/appengine) offers a fully managed and highly scalable cloud based host for both the backend and frontend processes when moving beyound local testing.  Free credits are offered for new accounts and a number of free hours are offered to current customers. 

### To get started: 

* Install Google’s Cloud SDK including gcloud (the primary CLI used to manage Google Cloud resources [link](https://cloud.google.com/sdk/gcloud))


* Initialize gcloud and choose / create a Google Cloud project ([link](https://cloud.google.com/sdk/docs/initializing))

  ```
	gcloud init
  ```
   
    ---  
    ### A Note re: Security  
    Before deploying the code to AppEngine it is advised to consider the potential issues of publishing to a public endpoint.  Unless this involves a test instance of Looker with non-sensitive data, we will need to protect the endpoint from unauthorized use.   

    One option is to configure the Firewall rules as to only allow access from your IP address. 
    - To do this: 
      * Make sure the project is selected in the AppEngine Dashboard.  
      * Select **Firewall rules** from the left navigation menu.  
      * Select the **default** rule, click **edit**, and select **Deny** for range * and then **Save**.
      * The click **Create Rule** on the top navigation menu. 
      * Enter 10 for **Priority**, select **Allow**, and enter your IP address in the IP Range box.  Click **Save**.  
    ---  
    <br>

* Create a directory to contain both the front and back end components: 

  ```
   mkdir AppEngineExample 
  ```

* Create a sub-directory for the front end client: 

  ```
    mkdir client 
  ```

* Clone or copy the FrontEnd code ([repo](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend)) into ./client using 
  
  ```
  cd client 
  git clone {repo-ink} .  (Note the dot to copy directly into the /client subdirector without creating another subdirectory)
  ```

* Working inside the /client directory we need to create the file *client.yaml* containing:

  ```
  runtime: nodejs16
  service: default
  handlers:
      # Serve all static files with urls ending with a file extension
      - url: /(.*\..+)$
        static_files: dist/\1
        upload: dist/(.*\..+)$
        # catch all handler to index.html
      - url: /.*
        static_files: dist/index.html
        upload: dist/index.html
  ```

We will need to modify the client .env file but will need an API url from the API deploy (covered below). For now we will deploy the client first to set it as the default service in App Engine:  

* Deploy the client with:
  
  ```
  gcloud app deploy client.yaml
  ```
  
* Navigate back a directory and create a sub-directory for the back end component: 

  ```
    cd ..
    mkdir api 
  ```
  
* Clone or copy the BackEnd code into /api

  ```
  cd api
  git clone {repo-link} . 
  ```

* Within the /api directory, we will need to create an **app.yaml** file containing:

  ```
  runtime: nodejs16

  service: api

  network:  
    forwarded_ports:  
      - 8080

  entrypoint: "node ./bin/www"
  ```

* We will also need to modify the .env file and set:

  ```
  PBL_PORT=8080
  ```

* Deploy to AppEngine:

  ```
	gcloud app deploy app.yaml 
  ```

* Note the target url. When deploy completes, test by pointing browser to: 

  ```
	{target-url} /api/me
  ```

* Now we will need to return and modify the **client** .env file with the {target-url} created for the API.

  ```
    cd ../client
  ```

  - Update: <b>API_HOST</b> to point to the target-url returned during the API Deploy above.

  - Update: <b>PBL_DEV_PORT</b> to 80  

* Update the client again with: 
  
  ```
  gcloud app deploy client.yaml 
  ```

* At this point, from the Google Cloud Platform site, go to the AppEngine dashboard and select Services. 

* You should see the two services  but we need to create a Dispatch Route pointing to the API endpoint. 
 
* We will need to create a file in /client named *dispatch.yaml* containing: 

  ```
  dispatch:
    - url: '*/api/*'
      service: api
  ```


* This will send all traffic on /api to service: api.

* Deploy dispatch.yaml with: 

  ```
	gcloud app deploy dispatch.yaml
  ```


## Additional resources: 
---  
[Looker API & Embedded Ref ](https://docs.looker.com/reference/api-embedding-intro)

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

## License

Apache 2.0; see [`LICENSE`](LICENSE) for details.

## Disclaimer

This project is not an official Google project. It is not supported by
Google and Google specifically disclaims all warranties as to its quality,
merchantability, or fitness for a particular purpose.