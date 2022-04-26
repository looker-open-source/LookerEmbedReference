[<img src="https://looker.com/assets/img/images/logos/looker.svg" alt="Looker" width="200"/>](https://www.looker.com)

# Embed Reference - Node Backend

This application is the backend / server component supporting the [reference implementation library](../README.md) of examples for building Embedded [Looker](https://www.looker.com) Solutions.  

This [Node](https://nodejs.org) application uses the [Looker API](https://docs.looker.com/reference/api-and-integration) to provide embed urls to the user-facing React [application](../Frontend/).


## About Embedding Looker
---
Embedding Looker involves displaying and interacting with Looker content from an outside source, such as the users website or in a third party SAS solution from another vendor. This offers a way to seemlessly leverage the power of Looker to enhance a third party product and / or offer a secure method for an outside user to interact with the data provided. 

For more please see the documentation for the [Front End](../Frontend/README.md#about-embedding-looker) component.


## Prerequisites
---
There are two methods of running this application; locally or on [GCP AppEngine.](https://cloud.google.com/appengine) 

* [Node](https://nodejs.org)
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
PBL_BACKEND_PORT=3000
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


* In the .env file for `Backend-Node`, update `PBL_BACKEND_PORT` parameter:

  ```
  PBL_BACKEND_PORT=8080
  ```

* Deploy Backend server to AppEngine:

  ```
	gcloud app deploy app.yaml 
  ```

* Note the target url. When deploy completes, test by pointing browser to: 

  ```
	{target-url}/api/me
  ```

* Now we will need to return and modify the **client** .env file (../Frontend/.env) with the {target-url} created for the API from the previous step.


  - Update: <b>API_HOST</b> to point to the target-url returned during the API Deploy above.

  - Update: <b>PBL_CLIENT_PORT</b> to 80  

* Before deploying the front-end client, you will need to first do a build:
  ```
  cd ../frontend
  yarn build
  ```

* Once the build is complete, deploy the front-end app and a dispatch route pointing to the API endpoint:
  ```
  gcloud app deploy client.yaml dispatch.yaml
  ```

* You should now be able to access your app using the target url that is returned!
  


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