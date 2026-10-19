#!/usr/bin/env bash
# Requires local quad-backend:smoke and quad-frontend:smoke images and Docker.
set -euo pipefail
prefix="quad-smoke-$$"
cleanup() {
  status=$?
  if (( status != 0 )); then
    docker logs "$prefix-backend" || true
    docker logs "$prefix-frontend" || true
    docker logs "$prefix-db" || true
  fi
  docker rm -f "$prefix-backend" "$prefix-frontend" "$prefix-db" >/dev/null 2>&1 || true
  docker network rm "$prefix" >/dev/null 2>&1 || true
  exit "$status"
}
trap cleanup EXIT
docker network create "$prefix" >/dev/null
docker run -d --name "$prefix-db" --network "$prefix" --network-alias db \
  -e POSTGRES_DB=quad_assignment -e POSTGRES_USER=quad_assignment \
  -e POSTGRES_PASSWORD=smoke-test-only postgres:17.7-alpine >/dev/null
for attempt in {1..60}; do
  if docker exec "$prefix-db" pg_isready -h 127.0.0.1 -U quad_assignment -d quad_assignment >/dev/null 2>&1; then break; fi
  sleep 2
done
docker exec "$prefix-db" pg_isready -h 127.0.0.1 -U quad_assignment -d quad_assignment
docker run -d --name "$prefix-backend" --network "$prefix" \
  --user 185:185 --cap-drop ALL --security-opt no-new-privileges \
  -p 127.0.0.1:18080:8080 -p 127.0.0.1:19000:9000 \
  -e QUARKUS_DATASOURCE_JDBC_URL=jdbc:postgresql://db:5432/quad_assignment \
  -e QUARKUS_DATASOURCE_USERNAME=quad_assignment \
  -e QUARKUS_DATASOURCE_PASSWORD=smoke-test-only quad-backend:smoke >/dev/null
docker run -d --name "$prefix-frontend" --network "$prefix" \
  --user 101:101 --read-only --tmpfs /tmp:rw,noexec,nosuid,uid=101,gid=101 \
  --cap-drop ALL --security-opt no-new-privileges \
  -p 127.0.0.1:18081:8080 quad-frontend:smoke >/dev/null
wait_ready() {
  for attempt in {1..90}; do
    if curl --silent --fail --max-time 5 http://127.0.0.1:19000/q/health/ready >/dev/null; then return; fi
    sleep 2
  done
  return 1
}
wait_ready
curl --fail --max-time 5 http://127.0.0.1:19000/q/health/started
curl --fail --max-time 5 http://127.0.0.1:19000/q/health/live
test "$(curl --silent -o /dev/null -w '%{http_code}' http://127.0.0.1:18080/q/health/live)" = 404
curl --fail --max-time 5 http://127.0.0.1:18081/healthz
test "$(curl --silent --fail http://127.0.0.1:18081/)" = "$(curl --silent --fail http://127.0.0.1:18081/quiz/refresh)"
test "$(curl --silent -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/assets/missing.js)" = 404
test "$(curl --silent -o /dev/null -w '%{http_code}' http://127.0.0.1:18081/api/get_categories)" = 404
# Verify Flyway created the schema, and retain a question across backend restarts.
docker exec "$prefix-db" psql -U quad_assignment -d quad_assignment -v ON_ERROR_STOP=1 -c \
  "INSERT INTO questionandanswermodel (id, question) VALUES ('00000000-0000-0000-0000-000000000001', 'Persistence smoke test');"
docker stop "$prefix-db" >/dev/null
test "$(curl --silent --max-time 15 -o /dev/null -w '%{http_code}' http://127.0.0.1:19000/q/health/ready)" = 503
curl --fail --max-time 5 http://127.0.0.1:19000/q/health/live
docker start "$prefix-db" >/dev/null
wait_ready
docker restart "$prefix-backend" >/dev/null
wait_ready
test "$(docker exec "$prefix-db" psql -U quad_assignment -d quad_assignment -Atc \
  "SELECT count(*) FROM questionandanswermodel WHERE question = 'Persistence smoke test';")" = 1
echo 'Runtime images, SPA fallback, migrations, health separation and persistence verified.'
