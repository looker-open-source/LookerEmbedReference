### Basics
The frontend server (from this repository) serves a static web site.  It relies on a backend server ([node](https://github.com/bytecodeio/LookerEmbeddedReference-Backend), or [java](https://github.com/bytecodeio/LookerEmbeddedReference-Backend-java)) to communicate securely with Looker.  To show Looker Dashboards or Looks, the frontend server requests a [Signed SSO URL](https://docs.looker.com/reference/embedding/sso-embed) from the backend server.  This URL is then added to an iframe on the site.  Inside the iframe, the dashbaord or Look is served directly from the Looker server. 



## Contributing

See [`CONTRIBUTING.md`](CONTRIBUTING.md) for details.

## License

Apache 2.0; see [`LICENSE`](LICENSE) for details.

## Disclaimer

This project is not an official Google project. It is not supported by
Google and Google specifically disclaims all warranties as to its quality,
merchantability, or fitness for a particular purpose.
