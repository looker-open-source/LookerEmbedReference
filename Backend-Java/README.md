<img src="https://looker.com/assets/img/images/logos/looker.svg" alt="Looker" width="200"/>

# Embed Reference - Java Backend

This application is the backend / server component supporting the [reference implementation library](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend) of examples for building Embedded [Looker](https://www.looker.com) Solutions.  

This JavaScript application uses the [Looker API](https://docs.looker.com/reference/api-and-integration) to provide embed urls to the user-facing React [application.](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend)

There is a [Node backend example](https://github.com/bytecodeio/LookerEmbeddedReference-Backend) of this application as well.

## About Embedding Looker
---
Embedding Looker involves displaying and interacting with Looker content from an outside source, such as the users website or in a third party SAS solution from another vendor. This offers a way to seemlessly leverage the power of Looker to enhance a third party product and / or offer a secure method for an outside user to interact with the data provided. 

For more please see the documentation for the [Front End](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend#about-embedding-looker) component.

## Prerequisites
---
There are two methods of running this application; locally or on [GCP AppEngine.](https://cloud.google.com/appengine) 

* A valid Looker API Key created from [User Admin.](https://docs.looker.com/admin-options/settings/users#api3_keys)

## Installation (local)

---

1. Clone or download a copy of this template to your development machine.
2. Navigate (cd) to the template directory on your system.
3. Set the environmental variables.

   - This is set with the Property File **application.yml** located in **./main/resources**.
     There is a sample file **application-example.yml** with instructions in the same location.
     Instead of adding variables to the file, these variables may be set as environment variables.

4. From the project directory (that contains the pom.xml file), set up a Maven Wrapper for the project.
   https://maven.apache.org/wrapper/
   - `mvn -N wrapper:wrapper`
5. Run the project.
   - `./mvnw spring-boot:run `
6. The server should be up and running locally! It can be tested by navigating to `localhost:3000/api/me` (or whichever server port is set as an environmental variable in application.yml).

## Additional resources:

---

[Looker API & Embedded Ref ](https://docs.looker.com/reference/api-embedding-intro)
=======

---

1. Clone or download a copy of this template to your development machine.
2. Navigate (cd) to the template directory on your system.
3. Set the environmental variables

   - This is set with the Property File **application.yml** located in **./main/resources**.
     There is a sample file **application-example.yml** with instructions in the same location.
     Instead of adding variables to the file, these variables may be set as environment variables.

4. From the project directory (that contains the pom.xml file), set up a Maven Wrapper for the project
   https://maven.apache.org/wrapper/
   - `mvn -N wrapper:wrapper`
5. Run the project
   - `./mvnw spring-boot:run `
6. The server should be up and running! It can be tested by navigating to `localhost:3000/api/me` (or whichever server port is set as an environmental variable in application.yml)

## Google AppEngine Installation (optional)

---

Google [AppEngine](https://cloud.google.com/appengine) offers a fully managed and highly scalable cloud based host for both the backend and frontend processes when moving beyound local testing. Free credits are offered for new accounts and a number of free hours are offered to current customers.

### To get started:

- Install Google’s Cloud SDK including gcloud (the primary CLI used to manage Google Cloud resources [link](https://cloud.google.com/sdk/gcloud))

- Initialize gcloud and choose / create a Google Cloud project ([link](https://cloud.google.com/sdk/docs/initializing))

  ```
  gcloud init
  ```

  ***

  ### A Note re: Security

  Before deploying the code to AppEngine it is advised to consider the potential issues of publishing to a public endpoint. Unless this involves a test instance of Looker with non-sensitive data, we will need to protect the endpoint from unauthorized use.

  One option is to configure the Firewall rules as to only allow access from your IP address.

  - To do this:
    - Make sure the project is selected in the AppEngine Dashboard.
    - Select **Firewall rules** from the left navigation menu.
    - Select the **default** rule, click **edit**, and select **Deny** for range \* and then **Save**.
    - The click **Create Rule** on the top navigation menu.
    - Enter 10 for **Priority**, select **Allow**, and enter your IP address in the IP Range box. Click **Save**.

  ***

    <br>

- Create a directory to contain both the front and back end components:

  ```
   mkdir AppEngineExample 
  ```
  
* Create a sub-directory for the front end client: 

  ```
    mkdir client 
  ```
  
  - Clone or copy the FrontEnd code ([repo](https://github.com/bytecodeio/LookerEmbeddedReference-Frontend)) into ./client using

  ```
  cd client
  git clone {repo-link} .  (Note the dot to copy directly into the /client subdirectory without creating another subdirectory)
  ```
  
- Working inside the /client directory we need to create the file _client.yaml_ containing:

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
    
* Navigate back a directory and create a sub-directory for the back end component: 

  ```
    cd ..
    mkdir api 
  ```

- Clone or copy the Java BackEnd code into /api

  ```
  cd api
  git clone {repo-link} .
  ```

- Update the `api/src/main/resources/application.yml` file, and create a Maven Wrapper for the project, the same way as described in the local installation instructions.

- Install dependencies and create a new build to deploy to App Engine:

  ```
  yarn install
  yarn run build
  ```

- Deploy the client to App Engine as the default service with:

  ```
  gcloud app deploy client.yaml
  ```

- Create an **app.yaml** file in a new `api/src/main/appengine` directory. Add the following contents to the app.yaml file:

  ```
  runtime: java11
  instance_class: F1

  service: api
  ```

- In `api/src/main/resources/application.yml` update the server port to 8080:

  ```
  server:
    port: 8080
  ```

- Update `pom.xml` to include a Maven Google Cloud plugin that simplifies the deployment process.

  ```
  <?xml version="1.0" encoding="UTF-8"?>
   <project xmlns="http://maven.apache.org/POM/4.0.0" ...>
   ...
   <build>
      <plugins>
         ...
         <plugin>
         <groupId>com.google.cloud.tools</groupId>
         <artifactId>appengine-maven-plugin</artifactId>
         <version>2.2.0</version>
         <configuration>
            <version>1</version>
            <projectId>GCLOUD_CONFIG</projectId>
         </configuration>
         </plugin>
      </plugins>
   </build>
   ...
   </project>
  ```

- From the `api` directory, deploy the Spring Boot application too App Engine as an API service:

  ```
  ./mvnw -DskipTests package appengine:deploy
  ```

- Note the target url. When deploy completes, test by pointing browser to:

  ```
  {target-url} /api/me
  ```

- Now we will need to return and modify the **client** .env file with the {target-url} created for the API.

  - Update: <b>API_HOST</b> to point to port 8080

  - Update: <b>PBL_DEV_PORT</b> to 80

- Update the client again with:

  ```
  gcloud app deploy client.yaml
  ```

- At this point, from the Google Cloud Platform site, go to the AppEngine dashboard and select Services.

- You should see the two services but we need to create a Dispatch Route pointing to the API endpoint.

- We will need to create a file in /client named _dispatch.yaml_ containing:

  ```
  dispatch:
    - url: '*/api/*'
      service: api
  ```

- This will send all traffic on /api to service: api.

- Deploy dispatch.yaml with:

  ```
  gcloud app deploy dispatch.yaml
  ```

## Additional resources:

---

[Looker API & Embedded Ref ](https://docs.looker.com/reference/api-embedding-intro)

