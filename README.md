# ourios-perses-plugin

[Perses](https://perses.dev) plugins for
[Ourios](https://github.com/jensholdgaard/ourios): query the Ourios logs
DSL from Perses dashboards — log panels, tables, and time series
(including cost/usage charts over typed numeric columns).

| Plugin | Kind | Serves |
|---|---|---|
| `OuriosDatasource` | `Datasource` | connection + tenant to an Ourios querier |
| `OuriosLogQuery` | `LogQuery` | DSL queries returning records — log panels |
| `OuriosTimeSeriesQuery` | `TimeSeriesQuery` | `count`/`sum`/`min`/`max`/`avg by bucket(w)` — time-series panels |

## Install

Build the plugin archive and drop it into your Perses server's plugin
archive directory:

```sh
npm install
npm run build-mf
percli plugin build          # produces Ourios-<version>.tar.gz
```

Copy the archive into the directory your Perses `config.yaml` names as
`plugin.archive_path`; Perses extracts and loads it on startup.

## Configure a datasource

```json
{
  "kind": "Datasource",
  "metadata": { "name": "ourios", "project": "my-project" },
  "spec": {
    "default": true,
    "plugin": {
      "kind": "OuriosDatasource",
      "spec": {
        "proxy": {
          "kind": "HTTPProxy",
          "spec": {
            "allowedEndpoints": [
              { "endpointPattern": "/v1/query", "method": "POST" },
              { "endpointPattern": "/mcp", "method": "POST" }
            ],
            "headers": { "x-ourios-tenant": "my-tenant" },
            "url": "http://ourios-querier:4319"
          }
        }
      }
    }
  }
}
```

The Perses server proxies every panel query, attaching the tenant header
server-side — the browser never handles tenant selection. `/mcp` is
optional: allowing it lights up the query editor's schema suggestions
(fields, severity bands, and the promoted attributes of that
deployment). Against a querier with authentication enabled, missing or
wrong-tenant credentials surface as distinct errors in the panel.

## Write queries

Panels take a raw DSL statement:

```
severity >= warn | limit 100                          # a log panel
body == "api_request" | count by bucket(1h)           # a time series
sum(attr.cost_usd) by attr.model, bucket(1h)          # one series per model
```

Behaviour worth knowing:

- The dashboard time range is injected as a `range(...)` stage; a range
  you write by hand wins. The window is half-open (`from <= t < to`).
- The `bucket(w)` dimension is detected positionally, so group keys can
  come in any order.
- A `null` aggregate (every input in the group was NULL) renders as a
  gap, never a zero.
- Series identity is the full group tuple, so a group value containing
  the display delimiter cannot merge two series.

An example dashboard definition ships in the main repository under
[`examples/perses/`](https://github.com/jensholdgaard/ourios/tree/main/examples/perses).

## Compatibility

The declared minimum `ourios-server` version is **0.5.0**; CI runs the
container end-to-end suite against exactly that GHCR image, so a
contract break fails this repository's gate — not your dashboard.

## Development

```sh
npm install
npm test               # unit
npm run test:e2e       # container e2e (docker required)
npm run dev            # rsbuild watch
```

## License

Apache-2.0.
