# Quad assignment

## Introduction

I built this simple trivia application with a Quarkus backend and a React frontend powered by Vite, using the Open
Trivia Database API to retrieve questions. You can try the application at [quad.dylannas.nl](https://quad.dylannas.nl/).

## Running locally

Start the application in development mode with:

```shell script
./mvnw quarkus:dev
```

Once the application is running, you can access the UI directly through Vite at
<http://localhost:7000/> or through Quinoa at <http://localhost:7001/>. During
development, Vite forwards `/api` requests to Quarkus on port 7001, where you can
also access the Quarkus Dev UI at <http://localhost:7001/q/dev/>.

## Deployment

The application runs on my personal infrastructure, with Argo CD handling deployment after the repository's CI/CD
pipeline builds the container images.

The personal infrastructure is fully declaratively defined in its
own [GitHub Repository](https://github.com/KurzaCationer/infrastructure)
