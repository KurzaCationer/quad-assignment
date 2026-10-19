"""Render the production overlay and verify the assignment's deployment contract.

Requires kubectl (no cluster connection) and PyYAML==6.0.3.
"""
from pathlib import Path
import re
import subprocess

import yaml

ROOT = Path(__file__).resolve().parents[1]


def require(condition, message):
    if not condition:
        raise SystemExit(message)


rendered = subprocess.check_output(
    ["kubectl", "kustomize", str(ROOT / "deploy/overlays/production")], text=True
)
objects = [obj for obj in yaml.safe_load_all(rendered) if obj]
resources = {(obj["kind"], obj["metadata"]["name"]): obj for obj in objects}
require(len(resources) == len(objects) == 7, "Expected exactly seven distinct resources")
namespace = resources["Namespace", "quad-assignment"]
database = resources["Cluster", "quad-assignment-db"]
require(namespace["metadata"]["labels"]["infrastructure.kurza.nl/public-ingress"] == "true",
        "Namespace must allow public ingress")
for obj in objects:
    if obj["kind"] != "Namespace":
        require(obj["metadata"]["namespace"] == "quad-assignment", "Incorrect namespace")
for obj in (namespace, database):
    options = obj["metadata"]["annotations"]["argocd.argoproj.io/sync-options"].split(",")
    require({"Prune=false", "Delete=false"} <= set(options), "Persistent resources must survive deletion")
require(database["spec"]["instances"] == 1, "Expected single database instance")
require(database["spec"]["storage"]["size"] == "1Gi", "Expected initial 1Gi volume")
require(re.search(r"@sha256:[a-f0-9]{64}$", database["spec"]["imageName"]), "Pin the PostgreSQL image")
require(database["spec"]["bootstrap"]["initdb"] == {
    "database": "quad_assignment", "owner": "quad_assignment",
}, "Bootstrap database and operator-generated application credentials")
wave = lambda obj: int(obj["metadata"]["annotations"]["argocd.argoproj.io/sync-wave"])
require(wave(namespace) < wave(database), "Namespace must precede database")

containers = {}
for component, uid in (("backend", 185), ("frontend", 101)):
    name = f"quad-assignment-{component}"
    deployment = resources["Deployment", name]
    service = resources["Service", name]
    spec = deployment["spec"]
    pod = spec["template"]["spec"]
    labels = spec["template"]["metadata"]["labels"]
    require(spec["replicas"] == 1, "Expected single application replica")
    require(spec["selector"]["matchLabels"] == service["spec"]["selector"] == labels,
            "Service and Deployment selectors must match their pod")
    require(labels["app.kubernetes.io/name"] == name, "Components must have distinct selectors")
    require(service["spec"]["type"] == "ClusterIP", "Services must stay internal")
    require(service["spec"]["ports"] == [{"name": "http", "port": 80, "targetPort": "http"}],
            "Only expose application HTTP through each Service")
    require(pod["automountServiceAccountToken"] is False, "Do not mount Kubernetes credentials")
    security = pod["securityContext"]
    require(security["runAsNonRoot"] and security["runAsUser"] == uid, "Run with the image's non-root UID")
    container, = pod["containers"]
    containers[component] = container
    require(re.fullmatch(rf"kurza/{name}(?::sha-[a-f0-9]{{40}}|@sha256:[a-f0-9]{{64}})", container["image"]),
            "Use immutable image references from the production overlay")
    require({"name": "http", "containerPort": 8080} in container["ports"], "Serve HTTP on 8080")
    require(container["securityContext"]["allowPrivilegeEscalation"] is False, "Disable privilege escalation")
    require("ALL" in container["securityContext"]["capabilities"]["drop"], "Drop capabilities")
    requests = container["resources"]["requests"]
    require(requests["cpu"] and requests["memory"] and container["resources"]["limits"]["memory"],
            "Set CPU/memory requests and a memory limit")
    require(wave(database) < wave(deployment), "Database must precede applications")
    for probe, path, port in (
        ("readinessProbe", "/q/health/ready" if component == "backend" else "/healthz", "management" if component == "backend" else "http"),
        ("livenessProbe", "/q/health/live" if component == "backend" else "/healthz", "management" if component == "backend" else "http"),
    ):
        require(container[probe]["httpGet"] == {"path": path, "port": port}, "Incorrect probe")

backend = containers["backend"]
require(backend["startupProbe"]["httpGet"] == {"path": "/q/health/started", "port": "management"},
        "Use a separate startup health probe")
require(backend["startupProbe"]["periodSeconds"] * backend["startupProbe"]["failureThreshold"] >= 600,
        "Allow database initialization and migrations at startup")
env = {entry["name"]: entry for entry in backend["env"]}
require(env["QUARKUS_DATASOURCE_JDBC_URL"]["value"] ==
        "jdbc:postgresql://quad-assignment-db-rw:5432/quad_assignment", "Use the CNPG writer service")
for key in ("username", "password"):
    require(env[f"QUARKUS_DATASOURCE_{key.upper()}"]["valueFrom"]["secretKeyRef"] == {
        "name": "quad-assignment-db-app", "key": key,
    }, "Use CNPG-generated application credentials")
route = resources["HTTPRoute", "quad-assignment"]
require(route["metadata"]["labels"]["infrastructure.kurza.nl/public-dns"] == "true", "Enable public DNS")
require(route["spec"]["hostnames"] == ["quad.dylannas.nl"], "Incorrect hostname")
require(route["spec"]["parentRefs"] == [{
    "name": "public", "namespace": "public-ingress", "sectionName": "dylannas-nl-https",
}], "Reuse the shared HTTPS Gateway")
require(len(route["spec"]["rules"]) == 2, "Expected API and frontend routes only")
for rule, path, component in zip(route["spec"]["rules"], ("/api", "/"), ("backend", "frontend")):
    require(rule == {
        "matches": [{"path": {"type": "PathPrefix", "value": path}}],
        "backendRefs": [{"name": f"quad-assignment-{component}", "port": 80}],
    }, "Route to the correct Service without path rewriting")
print("Production manifests validated: images, routing, probes, persistence and security.")
