# Deployment

The production overlay serves `https://quad.dylannas.nl` through the existing
Cloudflare/Cilium Gateway. `main` is the deployment branch. Argo CD reads
`deploy/overlays/production`; it applies image changes only after Dylan merges
the generated deployment PR.

## Before pushing or enabling reconciliation

Create these GitHub Actions secrets and variables:

| Name | Kind | Purpose |
| --- | --- | --- |
| `DOCKERHUB_USERNAME` | Secret | Docker Hub account with write access to both `kurza/quad-assignment-*` repositories |
| `DOCKERHUB_TOKEN` | Secret | Docker Hub access token with write access |
| `DEPLOYMENT_APP_ID` | Variable | GitHub App ID for the deployment bot |
| `DEPLOYMENT_APP_PRIVATE_KEY` | Secret | PEM private key for that GitHub App |

Install the GitHub App on this repository with **Contents: read/write** and
**Pull requests: read/write**, plus the default metadata read permission. Use an
App identity independent of Dylan so Dylan can review the PR. The generated PR
uses an App installation token so GitHub will run its validation workflow;
PRs created using only `GITHUB_TOKEN` do not trigger those workflows. The workflow's
own `GITHUB_TOKEN` has only `contents: read`. Enable the repository/organization
settings that permit the bot to update its branch and create PRs. Protect `main`
with Dylan's review and require the `manifests` check; do not enable auto-merge
for deployment PRs.

Use public Docker Hub repositories by default. For private repositories,
provision a registry Secret in `quad-assignment` separately and add the same
`imagePullSecrets` reference to both Pod specs. Do not commit credentials.

The initial overlay deliberately references non-existent `sha-000…000` tags.
After configuring the settings, push the implementation to `main` (or merge
its implementation PR). CI will verify both applications, publish the images,
and open `codex/deployment-images` into `main`. Review and merge that PR to
replace **both** bootstrap references with actual immutable image digests.
Only then enable this Application in Argo CD. `workflow_dispatch` on `main`
can retry the initial publication even if the latest commit only changes docs
or deployment files. This repository needs no cluster credentials in CI.

## Builds and checks

```sh
# Java 25; production disables Quinoa without disabling schema generation.
./mvnw -B clean verify

# Node 24.19.0 (src/main/webui/.nvmrc); always use the freshly exported schema.
cp target/openapi/openapi.json src/main/webui/openapi.json
cd src/main/webui
npm ci
npm run build
cd ../../..
node scripts/verify-frontend.mjs

python -m pip install PyYAML==6.0.3
python scripts/validate-deployment.py
kubectl kustomize deploy/overlays/production

docker build -f src/main/docker/Dockerfile.jvm -t quad-backend:smoke .
docker build -f src/main/docker/Dockerfile.frontend -t quad-frontend:smoke .
bash scripts/smoke-images.sh
```

CI runs those checks on application PRs, including container smoke tests for
Flyway migrations, question persistence after a backend restart, health checks
during database failure, static serving, and SPA route refreshes. It publishes
`sha-<full source commit>` images for **linux/arm64 and linux/amd64** only on `main`
after all checks succeed. The publication steps build both architectures;
runtime smoke tests run on AMD64. Both digests must be available before the bot
updates the deployment PR. A build superseded by newer application changes on
`main` cannot update that PR; documentation and image-only merges do not discard
an otherwise current application build.

Manifest validation runs on every PR, including the bot's deployment PR. A merge
changing only deployment image references skips application builds and does not
open another deployment PR. No workflow pushes image updates directly to `main`
or merges a deployment PR.

For local development, `./mvnw quarkus:dev` retains Quinoa's managed Node/Vite
workflow. Open `http://localhost:7000/` or the proxied UI at
`http://localhost:7001/`. Vite proxies `/api` to Quarkus on port 7001. Production
uses root asset URLs and relative `/api/...` requests. `VITE_API_BASE_URL` is an
optional **build-time origin override**, without a trailing slash or `/api`
suffix; leave it unset for this deployment. Setting environment variables on a
running static container cannot change the bundle.

## Infrastructure handoff and first sync

`deploy/argocd-application.yaml` is the child Application to include in the
infrastructure repository's `argocd/kustomization.yaml`. It is deliberately
outside this application's Kustomize resources. The infrastructure checkout
already contains the corresponding child Application and platform-validator
support; reconcile those changes there separately. Its validator must include
`quad-assignment` in the expected Application names and skip local-path traversal
for this external repository, whose overlay is validated here. Add repository
read credentials in Argo CD if the assignment repository is private.

Keep automatic pruning disabled on this Application and omit its cascading
deletion finalizer. Namespace and database resources additionally use
`Prune=false,Delete=false`. Removing either is a deliberate manual operation.
The Namespace manifest supplies the shared public-ingress label; do not use
`CreateNamespace=true` as a substitute for it.

Before enabling reconciliation, select the actual production context and check:

```sh
kubectl --context <production> get nodes -L kubernetes.io/arch
kubectl --context <production> -n cnpg-system rollout status deployment/cnpg-cloudnative-pg
kubectl --context <production> get crd clusters.postgresql.cnpg.io
kubectl --context <production> get storageclass
```

Confirm the operator Deployment name if it differs. The database requests `1Gi`
using the cluster's default StorageClass. Confirm that a suitable default exists;
otherwise set `spec.storage.storageClass` in `deploy/base/database.yaml` to an
available class before syncing. Architecture defaults to ARM64 in the current
infrastructure configuration, and CI publishes both architectures.

Namespace, database, and application sync waves are `-2`, `-1`, and `0`.
For the first sync, sync through the database wave first and verify:

```sh
kubectl --context <production> -n quad-assignment get pvc
kubectl --context <production> -n quad-assignment wait --for=condition=Ready cluster/quad-assignment-db --timeout=600s
kubectl --context <production> -n quad-assignment get secret quad-assignment-db-app
```

Verify the PVC is Bound before syncing the application wave. CloudNativePG
generates the application Secret with `username` and `password`; Quarkus connects
to `quad-assignment-db-rw:5432/quad_assignment` and runs Flyway at startup.
The startup probe allows ten minutes for initialization. Agroal's datasource
check contributes to readiness, while liveness is independent of PostgreSQL.
Health endpoints use management port 9000, which neither Service nor HTTPRoute
exposes. The frontend runs Nginx as UID 101 with a read-only root filesystem and
a writable `/tmp`; the backend uses the existing Java 25 runtime as UID 185.

No cluster resources were applied while implementing this repository. Production
operator health, storage provisioning, Gateway acceptance, and browser behavior
must be checked in the actual cluster.

## Acceptance and rollback

After the first application sync:

```sh
kubectl --context <production> -n quad-assignment rollout status deployment/quad-assignment-backend --timeout=600s
kubectl --context <production> -n quad-assignment rollout status deployment/quad-assignment-frontend --timeout=300s
kubectl --context <production> -n quad-assignment logs deployment/quad-assignment-backend
kubectl --context <production> -n quad-assignment get httproute quad-assignment -o yaml
```

Confirm Flyway completed and the HTTPRoute has `Accepted=True` and
`ResolvedRefs=True` for the shared Gateway. Open `https://quad.dylannas.nl`, load
categories and questions, submit answers, and verify scoring. Refresh the page
with its quiz search parameters and confirm browser API calls use HTTPS on
`quad.dylannas.nl` with one `/api` prefix. Restart the backend and verify stored
questions survive in PostgreSQL.

Roll back by reverting **both** application image references through a reviewed
Git change. Flyway migrations are not reversed by an image rollback; review
migration compatibility first. One database instance and a persistent volume
provide neither backups nor high availability.

References: [Quinoa configuration](https://docs.quarkiverse.io/quarkus-quinoa/dev/config-reference.html),
[Quarkus health](https://quarkus.io/guides/smallrye-health/),
[CloudNativePG images](https://github.com/cloudnative-pg/postgres-containers),
[deployment PR action](https://github.com/peter-evans/create-pull-request).
