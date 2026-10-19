# Quad assignment deployment plan

## Goal

Host the assignment at `https://quad.dylannas.nl` using Kustomize manifests in this repository and Argo CD. Deploy the React frontend and Quarkus backend separately, with PostgreSQL managed by the existing CloudNativePG operator.

This document is a plan only; it does not deploy resources.

## Target layout

```text
Browser -> Cloudflare -> existing Cilium public Gateway
                         |-- /api and /api/* -> backend Service -> Quarkus :8080
                         |-- all other paths -> frontend Service -> static web server :8080

Quarkus -> CloudNativePG read/write Service -> PostgreSQL
Quarkus -> https://opentdb.com
```

| Component | Docker Hub image | Kubernetes workload |
| --- | --- | --- |
| Backend | `kurza/quad-assignment-backend` | Deployment, one replica |
| Frontend | `kurza/quad-assignment-frontend` | Deployment, one replica |
| Database | Compatible, pinned CloudNativePG PostgreSQL image | CloudNativePG Cluster, one instance |

Use namespace `quad-assignment`. Both application Services remain `ClusterIP`; PostgreSQL remains internal.

## 1. Separate production builds

### Backend

- Keep the existing Java 25 JVM packaging and adapt `src/main/docker/Dockerfile.jvm` as needed.
- Disable Quinoa for the production backend build so it neither builds nor bundles the frontend. Preserve the current local development workflow.
- Keep the REST prefix `/api` and listen on `0.0.0.0:8080` in production.
- Export the OpenAPI schema as a build artifact for frontend client generation. Ensure disabling Quinoa does not disable that schema export.
- Add the Quarkus SmallRye Health extension for startup, readiness and liveness probes. Readiness should reflect database availability; liveness should not restart the process merely because PostgreSQL is temporarily unavailable.

### Frontend

- Add `src/main/docker/Dockerfile.frontend` and a static web server configuration.
- Run `npm ci` and the existing frontend build with the exported `openapi.json` available before Orval runs. Copy only the built static files into the runtime image.
- Serve the UI at `/`, replacing the production `/quinoa` arrangement. Align the Vite asset base and React router with `/`.
- Configure the static server to return `index.html` for client-side routes and support refreshes on those routes.
- Replace the generated client's `process.env.VITE_API_BASE_URL || 'http://localhost:7001'` configuration with same-origin URLs supported by Vite. Preserve the generated `/api/...` paths without adding `/api` twice.
- Verify the browser bundle contains no localhost API target and does not require Node's `process` global. Environment variables injected into the running static container do not automatically change an already-built Vite bundle.
- Keep frontend and API on the same origin; production CORS is unnecessary for this deployment.

## 2. Add Kustomize manifests

Use a base and one production overlay:

```text
deploy/
  base/
    kustomization.yaml
    namespace.yaml
    backend-deployment.yaml
    backend-service.yaml
    frontend-deployment.yaml
    frontend-service.yaml
    database.yaml
  overlays/
    production/
      kustomization.yaml
      httproute.yaml
```

- Include the base from the production overlay. Keep production image references in the overlay's `images` entries.
- Give frontend and backend distinct labels and Service selectors. Route Service port `80` to container port `8080`.
- Set CPU/memory requests and memory limits for both Deployments. Run application containers without root privileges and without mounted Kubernetes API credentials.
- Add HTTP startup/readiness/liveness probes for Quarkus and HTTP readiness/liveness probes for the static frontend. Keep Quarkus health endpoints internal.

### Public routing

Reuse the existing infrastructure resources:

- Namespace label: `infrastructure.kurza.nl/public-ingress: 'true'`.
- HTTPRoute label: `infrastructure.kurza.nl/public-dns: 'true'`.
- Hostname: `quad.dylannas.nl`.
- Parent Gateway: `public`, namespace `public-ingress`, section `dylannas-nl-https`.
- Route `PathPrefix /api` to the backend without rewriting the path, and `PathPrefix /` to the frontend. The more specific API match takes precedence.

The existing wildcard certificate and ExternalDNS configuration provide HTTPS and the Cloudflare DNS record. No application-specific certificate, Gateway or public load balancer is needed.

## 3. Configure PostgreSQL

- Wait until the infrastructure-managed CloudNativePG operator and CRDs are healthy.
- Create a `postgresql.cnpg.io/v1` Cluster named `quad-assignment-db` in `quad-assignment`, with `instances: 1`.
- Bootstrap an assignment database and its application owner. Use the operator-generated application Secret rather than committing credentials.
- Request a small persistent volume, initially `1Gi`, and select an available storage class after checking the cluster. Confirm volume provisioning before starting the backend.
- Configure the backend with:
  - `QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://quad-assignment-db-rw:5432/quad_assignment`.
  - `QUARKUS_DATASOURCE_USERNAME` from Secret `quad-assignment-db-app`, key `username`.
  - `QUARKUS_DATASOURCE_PASSWORD` from the same Secret, key `password`.
- Keep Flyway migrations enabled at startup. Keep schema cleaning restricted to development/tests, as it is currently.
- Place the Namespace/Cluster before the application Deployments using sync waves, and allow backend startup time for database initialization and migration.
- Protect the database Cluster and its Namespace from automatic pruning/cascading deletion when configuring the Application. Treat database removal as a deliberate action.

A single database instance matches the assignment's single-node environment; persistence does not provide a backup or high availability.

## 4. Build and publish to Docker Hub

Add a GitHub Actions workflow that:

1. Builds and verifies the backend using Java 25, exporting the OpenAPI schema without bundling the UI.
2. Builds the frontend from that schema using the project's Node version and lockfile.
3. Builds both runtime images for the deployed node architecture. Verify the actual architecture first; the infrastructure currently defaults to ARM64. Publishing both `linux/arm64` and `linux/amd64` is also suitable.
4. Logs into Docker Hub using GitHub Actions secrets for the username and access token.
5. Pushes `kurza/quad-assignment-backend:sha-<commit>` and `kurza/quad-assignment-frontend:sha-<commit>` only from the deployment branch after successful checks. Pull requests validate builds without publishing.
6. After both images are published successfully, updates both image references in `deploy/overlays/production/kustomization.yaml` together on a dedicated deployment branch, preferably using the pushed image digests. Avoid deploying mutable `latest` tags.
7. Opens or updates a pull request from that branch into the deployment branch. Include the source commit and both image references in the PR description. The workflow must not push these updates directly to the deployment branch or automatically merge the PR; Dylan reviews and approves the PR before merging it.
8. Validates the rendered Kustomize manifests on the deployment PR. Ensure a merge that changes only deployment image references does not rebuild images and create another deployment PR.

Use a GitHub Actions bot identity for the generated deployment PR. Configure the workflow's repository permissions and repository settings to allow branch updates and PR creation. Keep the PR creation identity separate from Dylan's personal identity so the generated PR can be reviewed by Dylan.

Argo CD watches only the deployment branch and applies the new image references after the deployment PR is merged. Opening or updating the PR does not deploy it. Image-build CI needs Docker Hub and GitHub permissions, but no cluster credentials. If Docker Hub repositories are private, provision an image-pull Secret separately and reference it from both Deployments.

## 5. Connect Argo CD

The only infrastructure-repository changes needed for this assignment are:

- Add a `quad-assignment` child Application to the existing root Kustomization.
- Point it to this repository's Git URL, deployment branch and `deploy/overlays/production` path, targeting namespace `quad-assignment`.
- Enable automatic reconciliation/self-healing and server-side apply. Let the namespace manifest supply the public-ingress label.
- Extend the existing platform validator's expected child-Application list. Its current local-path traversal assumes infrastructure-owned paths, so adjust it to skip or explicitly handle this external-repository Application.

Configure Argo CD read access if this repository is private. The root Application and CloudNativePG operator stay owned by the infrastructure repository.

## 6. Verify the assignment deployment

- Render `kubectl kustomize deploy/overlays/production` and verify image references, namespace, selectors and route destinations.
- Confirm PostgreSQL is ready and Flyway migrations finish successfully.
- Confirm both Deployments become ready and the HTTPRoute is accepted by the shared Gateway.
- Open `https://quad.dylannas.nl`, load categories/questions, submit answers and verify scoring.
- Verify frontend route refreshes work and browser API calls use HTTPS on the same hostname.
- Restart the backend and verify previously stored questions remain available in PostgreSQL.
- Roll back application image references through Git if needed. Review database migration compatibility separately; rolling back images does not undo Flyway migrations.

## References

- [Argo CD Kustomize support](https://argo-cd.readthedocs.io/en/stable/user-guide/kustomize/)
- [Quinoa configuration](https://docs.quarkiverse.io/quarkus-quinoa/dev/config-reference.html)
- [CloudNativePG application connections](https://cloudnative-pg.io/documentation/current/applications/)
