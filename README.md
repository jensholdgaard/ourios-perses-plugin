# ourios-perses-plugin

[Perses](https://perses.dev) plugins for [Ourios](https://github.com/jensholdgaard/ourios)
— the OTLP-native log backend built on Parquet, a Drain-derived template
miner, and DataFusion.

> **Status: pre-implementation.** This repository is the designated home
> for the plugins; the design is governed by
> [RFC 0041](https://jensholdgaard.github.io/ourios/rfcs/0041-dashboard-datasource-plugins.html)
> in the main repository, where the acceptance criteria live. Code lands
> once that RFC reaches `specified`.

## What will live here

Three plugins, scaffolded with `percli`:

| Plugin | Kind | Serves |
|---|---|---|
| `OuriosDatasource` | `Datasource` | connection + auth to an Ourios querier |
| `OuriosLogQuery` | `LogQuery` | the Ourios logs DSL (RFC 0002) — log panels |
| `OuriosTimeSeriesQuery` | `TimeSeriesQuery` | `count`/`sum`/`avg by bucket(w)` aggregations — time-series panels, including the FinOps spend charts |

## The contract

The plugins consume Ourios's **stable, versioned query surface** — the
RFC 0016 HTTP API speaking the RFC 0002 logs DSL — and adapt to a
deployment's schema at runtime via the RFC 0032 `ourios://query-schema`
resource (DSL fields, severity bands, promoted attributes, cost tiers).
Nothing in this repository reaches into Ourios internals; that is what
makes a separate repository safe.

Compatibility is enforced, not assumed: CI here runs end-to-end against
the released `ourios-server` container image from GHCR.

## Why a separate repository

- The main repository is a `#![deny(unsafe_code)]` Rust workspace with a
  tuned build/CI identity; this is a TypeScript/React workspace with its
  own toolchain (rsbuild, CUE schemas, npm) and its own supply-chain
  posture.
- Plugin releases track Perses upstream churn on their own cadence, with
  a declared minimum Ourios server version — neither project's releases
  hold the other's.
- Standalone plugin repositories are the Perses and Grafana ecosystem
  convention.

The demo dashboard definitions (e.g. the agent FinOps dashboard) are
Ourios product artifacts and live in the main repository, not here.

## License

Apache-2.0, matching the main project.
