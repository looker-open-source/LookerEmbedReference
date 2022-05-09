# Looker Embed Reference 

 This repo containes contains examples of how to embed Looker into a web application. There are 3 components provided:
 
  * [Frontend]( ./Frontend/README.md) - A sample React application that uses the Looker [Embed SDK](https://docs.looker.com/reference/embed-sdk/embed-sdk-intro) and [Components](https://docs.looker.com/data-modeling/extension-framework/components)

 * [Node Backend]( ./Backend-Node/README.md) 

 * [Java Backend]( ../Backend-Java/README.md)

 This is intended to be an example application, and shows many different ways of embedding Looker in another site.  It demonstrates several similar ways to include a dashboard or visualization, and all of these techniques are valid.  The examples that this application uses come from a 'data block' provided by Looker, using a public data set.  
 
 ## Getting Started

 1. Install and run the [Frontend]( ./Frontend/README.md) web app using the integrated development server. 
 2. Install and run either the [Node]( ./Backend-Node/README.md) or [Java]( ./Backend-Java/README.md) backend.


The frontend React application serves a static web site.  It relies on a backend server ([node](./Backend-Node/README.md), or [java](./Backend-Java/README.md)) to communicate securely with Looker.  To show Looker Dashboards or Looks, the frontend server requests a [Signed SSO URL](https://docs.looker.com/reference/embedding/sso-embed) from the backend server.  This URL is then added to an iframe on the site.  Inside the iframe, the dashboard or Look is served directly from the Looker server. 

## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

## License

Apache 2.0; see [`LICENSE`](LICENSE) for details.

## Disclaimer

This project is not an official Google project. It is not supported by Google and Google specifically disclaims all  warranties as to its quality, merchantability, or fitness for a particular purpose.
