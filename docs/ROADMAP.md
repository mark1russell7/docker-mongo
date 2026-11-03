# Roadmap

This file is the plan of docker-mongo. The Status page of the site reads it.

| ID | Item | Status | Summary |
| --- | --- | --- | --- |
| D1 | The site with a live demo | done | The site at GitHub Pages shows the connection string, the resolved config and the Compose file of the settings. It also shows a dry run of init and seed. |
| D2 | The entry `./pure` | done | The settings, the connection string, the Compose file and the plans have no driver and no I/O. A browser bundle imports them from `@mark1russell7/docker-mongo/pure`. |
| D3 | Tests with a server in CI | not started | The tests examine the pure functions only. A CI job with a MongoDB service can also examine `initDatabase` and `seedDatabase` on a real server. |
