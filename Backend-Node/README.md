[<img src="https://looker.com/assets/img/images/logos/looker.svg" alt="Looker" width="200"/>](https://www.looker.com)

# Embed Reference - Node Backend

This application is the backend / server component supporting the [reference implementation library](../README.md) of examples for building Embedded [Looker](https://www.looker.com) Solutions.  

This [Node](https://nodejs.org) application uses the [Looker API](https://docs.looker.com/reference/api-and-integration) to provide embed urls to the user-facing React [application](../Frontend/).

**You must use this Node Backend server for the Conversational Analytics chat embedding example.** 

## About Embedding Looker
---
Embedding Looker involves displaying and interacting with Looker content from an outside source, such as the users website or in a third party SAS solution from another vendor. This offers a way to seemlessly leverage the power of Looker to enhance a third party product and / or offer a secure method for an outside user to interact with the data provided. 

For more please see the documentation for the [Front End](../Frontend/README.md#about-embedding-looker) component.

There are two methods of running this application; locally or on [GCP AppEngine.](https://cloud.google.com/appengine).

## Local installation

### Prerequisites

You local environment must have these dependencies installed:

* [Node v18](https://nodejs.org) (v18 verified)
* [Yarn](https://yarnpkg.com) package manager.
* [gcloud CLI](https://docs.cloud.google.com/sdk/docs/install-sdk). (OPTIONAL) Only if you want to enable Conversational Analytics chat.

### Steps

#### 1. Install dependencies

* Clone or download a copy of this repo to your local environment
* Navigate (cd) to the repo's root directory on your system.
* Install the dependencies with [Yarn.](https://yarnpkg.com/)

  ```
    yarn install
  ```

#### 2. Setup environmental variables

* Obtain a valid [Looker Client ID and Client Secret](https://docs.cloud.google.com/looker/docs/api-auth#authentication_with_an_sdk).
* Obtain your [Looker instance's embed secret](https://docs.cloud.google.com/looker/docs/embed-enable).
* Setup environment variables either in an .env file ([example](dot-env-example)) or in the environment directly in the terminal/command line using:  ```export envir_var=value```. The `.env` file should be saved at the root: `./Backend-Node/.env`

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

#### 2a. Setup Conversational Analytics (OPTIONAL)

You must follow these steps if you want to enable the Conversational Analytics chat embedding example.

##### Prerequisites

You should have:
* A Google Cloud project
* A user account with access to the Google Cloud project

##### 2a1. Setup Application Default Credentials (ADC) 

* Authenticate with your user account in your local environment:

  ```
  gcloud auth login
  ```

* Set application default credentials (ADC) and the Google Cloud project on your gcloud:

  ```
  gcloud auth application-default login
  gcloud auth application-default set-quota-project YOUR_PROJECT_ID
  ```

##### 2a2. Enable Cloud project APIs

* Enable Cloud project APIs with the command below. Please replace `YOUR_PROJECT_ID` with the ID of your Google Cloud project:

  ```
  gcloud services enable geminidataanalytics.googleapis.com bigquery.googleapis.com cloudaicompanion.googleapis.com --project=YOUR_PROJECT_ID
  ```

##### 2a3. Create the Conversational Analytics data agent

* Enable these cloud permissions on your user account:
  
  * `roles/cloudaicompanion.user`
  * `roles/looker.instanceUser`
  * `roles/bigquery.user`

* Open [Google Colab](https://colab.research.google.com/)
* Login as your user account
* Navigate to `File` > `Open notebook` > `GitHub`
* Enter `https://github.com/looker-open-source/LookerEmbedReference` into the `GitHub URL` field. 
* Select the `ca-colab.ipynb` python notebook.
* Run all of the notebook steps. You will need your Cloud project ID and your Looker instance’s URI with a trailing slash, like “https://my.looker.app/”. 
* You should have a successful result at the end of the notebook.

##### 2a4. Update your environment variables

* Add the following environment variables to your local environment. Follow previous steps of setting up environment variables. Replace `YOUR_PROJECT_ID` with your Cloud project ID.

  ```
  CLOUD_AGENT_ID=looker_embed_reference_data_agent
  CLOUD_PROJECT_ID=YOUR_PROJECT_ID
  ```

You now have a Conversational Analytics data agent available and ready to accept chat messages, query the Looker explores in your embedded Looker dashboard, and return results and visualizations.

#### 3. Start the Server

You can either start the server in dev mode:
  ```
  yarn dev  
  ```
or production mode:
  ``` 
  yarn start
  ```

## Google AppEngine Installation

Follow these steps to deploy BOTH, the `Frontend` and `Backend-Node` server to Google AppEngine.

Google [AppEngine](https://cloud.google.com/appengine) offers a fully managed and highly scalable cloud based hosting for both the backend and frontend server if you want to move beyond local testing.

### Prerequisites

You local environment must have these dependencies installed:

* [gcloud CLI](https://docs.cloud.google.com/sdk/docs/install-sdk). 

You should have:
* A Google Cloud project
* A user account with access to the Google Cloud project

### Consider and mitigate security issues

**Google is not responsible for any security issues or concerns stemming from using and/or deploying the Looker Embed Reference.**

You should consider the potential issues exposing a public endpoint with the Google AppEngine.  Unless your Looker instance only contains non-sensitive data, you should protect the endpoint from unauthorized use.

One option is you can configure  firewall rules to only allow access from specific IP addresses. Check out the [firewall rules documentation](https://docs.cloud.google.com/appengine/docs/flexible/creating-firewalls).

**You are responsible for securing your Google App Engine deployment.**



### Steps

#### 1. Setup your initial `.env` file

* Follow step `2. Setup environmental variables` from the `Local installation` steps to setup your `Backend-Node`'s `.env` file. You must setup a `.env` file in the `Backend-Node` directory. 

#### 1a. Setup Conversational Analytics (OPTIONAL)

* If you want to enable the Conversational Analytics powered chat example. Follow all of the steps of `2a. Setup Conversational Analytics` the `Local installation` steps. You must add the new environment variables to your backend `.env` file.

#### 2. Deploy the backend to Google AppEngine

* In the .env file for `Backend-Node`, update `PBL_BACKEND_PORT` parameter to `8080`:

  ```
  PBL_BACKEND_PORT=8080
  ```

* Deploy the backend server to Google AppEngine. Call the following command in the `Backend-Node` directory:

  ```
  gcloud app deploy app.yaml 
  ```
  Note the target url.

* When the deploy completes, note the target url. Test that your backend is up and running by pointing your browser to the URL: 

  ```
  YOUR_TARGET_URL/api/me
  ```

#### 3. Deploy the frontend to Google AppEngine

* Follow steps 1 and 2 in the `Frontend`'s `README`'s `Local installation` section.

* In the `.env` file for `Frontend`, update `API_HOST` to the target url from the step `2. Deploy the backend to Google AppEngine`, and update `PBL_CLIENT_PORT` to `80`:

  ```
  API_HOST=YOUR_TARGET_URL
  PBL_CLIENT_PORT=80
  ```

* Before deploying the front-end server, you will need to first build it. Call the follow command in your local environment in your `Frontend` directory:

  ```
  yarn build
  ```

* Once the build is complete, deploy the front-end app and a dispatch route pointing to the API endpoint:

  ```
  gcloud app deploy client.yaml dispatch.yaml
  ```

You should now be able to access your app in your browser using the target url that is returned!

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