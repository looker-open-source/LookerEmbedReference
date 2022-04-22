# Looker Embed Reference - Frontend 

 This application contains examples of embedding Looker.  It is a React application that uses the Looker [Embed SDK](https://docs.looker.com/reference/embed-sdk/embed-sdk-intro) and [Components](https://docs.looker.com/data-modeling/extension-framework/components). It requires running a backend application to handle API calls safely.  These applications are tightly coupled. There is a node and java version of the backend application.
 
 * [Node Backend Repository](https://github.com/bytecodeio/LookerEmbeddedReference-Backend)
 * [Java Backend Repository](https://github.com/bytecodeio/LookerEmbeddedReference-Backend-java)

 This is intended to be an example application, and shows many different ways of embedding Looker in another site.  It demonstrates several similar ways to inclue a dashboard or visualization, and all of these techniques are valid.  The examples that this application uses come from a 'data block' provided by Looker, using a public data set.  

## About Embedding Looker

Embedding Looker into a site can involve showing Looker content directly, and/or using the Looker API to interact with Looker.  An embedding website requires hosting, and usually requires a user login.  For companies who don't yet have non-public websites, consider the [Looker Extension Framework](https://cloud.google.com/blog/topics/developers-practitioners/building-looker-made-easier-extension-framework) instead of creating a new website.

### Basics
The frontend server (from this repository) serves a static web site.  It relies on a backend server ([node](https://github.com/bytecodeio/LookerEmbeddedReference-Backend), or [java](https://github.com/bytecodeio/LookerEmbeddedReference-Backend-java)) to communicate securely with Looker.  To show Looker Dashboards or Looks, the frontend server requests a [Signed SSO URL](https://docs.looker.com/reference/embedding/sso-embed) from the backend server.  This URL is then added to an iframe on the site.  Inside the iframe, the dashbaord or Look is served directly from the Looker server. 

### Details
The frontend server will handle user authentication, navigation, and rendering everything except Looker content.  In most cases, the frontend uses an iframe (inline frame element) to set space aside for Looker content.  Within the iframe, Looker renders and controls the content.  To investigate where these pieces are defined in the code, investigate these files:

* html entry point (*src/index.js*)
* menu (*src/App.js*)
* routing (*src/App.js*)
* dashboard embedding (*src/components/EmbedDashboard*)
* explore embedding (*src/components/EmbedExplore*)
* query embedding (*src/components/EmbedQuery*)
* embedding multiple iframes (*src/components/EmbedTwoIframes*)
* Implementing download button (src/components/EmbedDashboardDownload)
filters outside of iFrame using Looker component library (src/components/DashboardExternalFilters)
* Implementing schedule button outside of iframe (src/components/EmbedDashboardEvents)
* Implementing start and Stop button outside of iframe (src/components/EmbedDashboardEvents)
* Capturing callbacks on user interactions of embedded content  (src/components/EmbedDashboardEvents)
* Ability to adjust tiles on embedded dashboards  (src/components/EmbedDashboardLayout)
   * Hiding tiles
   * Adjusting the colors
* Looker Visualization Components (src/components/VizComponent)


#### Components
This application relies heavily on [Looker Components](https://developers.looker.com/components/develop).  The Looker Components library allows developers to quickly replicate the polished Looker user experience.  This application uses UI Components in many places.  It also contains examples of the new [Visualization Components](https://github.com/looker-open-source/components/tree/main/packages/visualizations) in the [Visualization Component file](*src/components/VizComponent)

## Looker Setup

You need administartive access to a Looker instance to embed Looker.  By default, every Looker won't have the necessary dashboards to display the content featured in this application.  We can add a dashboard and data from a public Looker block.  If you already have a connection to Google BigQuery configured in your Looker instance, please skip to step 3 below. 

### Install Looker Data Block
1. Start a free trial of [GCP](https://console.cloud.google.com/getting-started)
   - Sign up for a [free trial](https://console.cloud.google.com/freetrial/signup/tos)
      - This requires entering payment information, but you won't be charged unless you sign up for a paid account.
   - Create a new BigQuery database
      - Visit the Bigquery site and click [Try BigQuery free](https://cloud.google.com/bigquery)
      - This will guide you through the creation process
2. Create a connection to BigQuery, [create a new one](https://docs.looker.com/setup-and-management/database-config/google-bigquery) 
   - [Create a service account](https://docs.looker.com/setup-and-management/database-config/google-bigquery#creating_a_service_account_and_downloading_the_json_credentials_certificate) with access to the Google project and download the JSON credentials certificate.
   - [Create a temporary dataset](https://docs.looker.com/setup-and-management/database-config/google-bigquery#creating_a_temporary_dataset_for_persistent_derived_tables) for storing persistent derived tables.
   - [Set up the Looker connection](https://docs.looker.com/setup-and-management/database-config/google-bigquery#setting_up_the_bigquery_connection_in_looker) to your database.
      - Use the public_datasets schema
      - [Enable Persistent Derived Tables](https://docs.looker.com/setup-and-management/database-config/google-bigquery#creating_a_temporary_dataset_for_persistent_derived_tables) when configuring the connection
   - Test the connection.
3. [Install the ASC Demographic Data](https://docs.looker.com/data-modeling/looker-blocks#data_blocks) via the marketplace in your looker instance
   - In your Looker instance, click the [*Marketplace*](https://docs.looker.com/data-modeling/marketplace) icon in the upper right hand corner
   - Click the *Models* menu icon on the left
   - Click on *ASC Demographic Data*
   - Click *Install* 
   - When prompted, choose to install using the BigQuery connection from step 2
   - Once installed, you can view the dashboard in Looker with the context `/embed/dashboards/data_block_acs_bigquery::acs_census_overview`

### Update the Embed Domain Allowlist
In Looker, navigate to the Admin -> Platform -> Embed configuration page.  Add the entry 'https://localhost:3001' to the Embed Domain Allowlist.  If you are running the application on an app server, add that server's URI as well. If this URI is misspelled, or has a trailing '/', you will have CORS issues and the app will not function properly.

# Installation
Before using the frontend server, you'll need to install it.

## Prerequisites
* [Install git](https://git-scm.com/downloads)
* [Install node](https://nodejs.org/en/download/)
* [Install npm](https://docs.npmjs.com/cli/v7/configuring-npm/install)
* [Install yarn](https://classic.yarnpkg.com/lang/en/docs/install)

* Clone or download a copy of this repository to your local machine:
```
git clone git@github.com:bytecodeio/LookerEmbeddedReference-Frontend.git
```

* Navigate (cd) to the directory on your system.
* Install the dependencies with Yarn:
```
yarn install
```
  
## Environmental variables

These can be set in a .env file in the root project directory.  In production systems, they are often set in the environment directly using `export PBL_PORT=3001`, or similar OS-specific commands.

```
PBL_PORT=3001  # Note different port from backend 
API_HOST=http://localhost:3000
LOOKER_HOST=https://bytecodeef.looker.com
LOOKER_API_HOST=https://bytecodeef.looker.com:19999
LOOKERSDK_EMBED_HOST=https://example.looker.com   
```
For most installations, the LOOKER_HOST will be the same as the LOOKERSDK_EMBED_HOST variable. The LOOKER_API_HOST is usually the same, but with port 19999.

## Running Locally

Local hosting is recommended for learning and development.

### Start the dev server
```
yarn dev 
```

### Start the backend API server

Follow directions in the backend repository readme ([node](https://github.com/bytecodeio/LookerEmbeddedReference-Backend#installation-local), or [java](https://github.com/bytecodeio/LookerEmbeddedReference-Backend-Java/blob/main/README.md#installation-local)) to install, compile and run it.

### Point a browser to:

[http://localhost:3001/embed-dashboard](http://localhost:3001/embed-dashboard)  
Change the port from 3001 if you set a different PBL_PORT

## Running in Google AppEngine

Instead of running this locally, use Google AppEngine to run it in the cloud.
Follow the directions in the backend repository README ([node](https://github.com/bytecodeio/LookerEmbeddedReference-Backend#google-appengine-installation-optional), or [java](https://github.com/bytecodeio/LookerEmbeddedReference-Backend-Java/blob/main/README.md#google-appengine-installation-optional))


### Other resources:

[Looker API & Embedded Ref ](https://docs.looker.com/reference/api-embedding-intro)

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

## License

Apache 2.0; see [`LICENSE`](LICENSE) for details.

## Disclaimer

This project is not an official Google project. It is not supported by
Google and Google specifically disclaims all warranties as to its quality,
merchantability, or fitness for a particular purpose.