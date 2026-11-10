# Changelog

## 0.1.3

A PATCH release, with no change to the API.

- The package does not ship `dist/.tsbuildinfo`. This file is a build cache of TypeScript, and the code does not use it.
- The development tools are newer: `@mark1russell7/api-report` 0.5.3 and `@mark1russell7/conventions` 0.40.6.

## 0.1.2

A PATCH release: bug fixes, with no change to the API.

- The `mongo:8.0` image did not start on Linux kernels 6.19 to 7.0.13 (MongoDB SERVER-121912). The shipped `docker-compose.yml` and `composeFile` set `GLIBC_TUNABLES=glibc.pthread.rseq=1` in the container.
- A replica set with a user did not start, because `mongod` refuses authorization in a replica set without a key file. `composeFile` makes a key file on the volume of the configuration.
- `connectionUri` adds `directConnection=true` for a replica set. The one member records a host name of the container, and that name does not resolve from the host.
- `resolveMongoConfig` reports `MONGO_USER` without `MONGO_PASSWORD`. The container makes no user without the password.
- A new CI job starts the Compose file of four settings and connects to each server.
