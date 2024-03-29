<img align="right" width="25%" src="https://raw.githubusercontent.com/twicpics/health-check/master/logo.png">

# TwicPics Health Check

[![NPM Version][npm-image]][npm-url]
[![License][license-image]][license-url]

__configurable health check server with built-in prometheus metrics for CPU and GPU__

## Install

In the root directory of your NodeJS project, type

`yarn add @twicpics/health-check`

or

`npm add @twicpics/health-check`

depending on the package manager you fancy the most.

## Usage

```js
const healthCheck = require( `@twicpics/health-check` );

healthCheck.createServer( options );
```

## Routes

The health check server will expose the following routes:

| route | handler | description |
|-|-|-|
| `/` | `health` | main health check |
| `/health` | `health` | main health check |
| `/metrics` | `metrics` | prometheus-formatted metrics |
| `/ready` | `ready` | checks if main server is ready |
| `/version` | - | returns main server version in plain text |

All routes return plain text results.

Status codes are:
- `200` when things went properly
- `404` when a route doesn't exist
- `503` when something went wrong

`/ready` can issue a `503` when not ready as normal behaviour.

Out of the box, `/metrics` provides four metrics:
- `cpu_memory`: how much of the CPU memory is being used (as a ratio between `0` and `1`) 
- `cpu_usage`: how much the CPU processing power is being used (as a ratio between `0` and `1`)
- `gpu_memory`: how much of the GPU memory is being used (as a ratio between `0` and `1`)
- `gpu_usage`: how much the GPU processing power is being used (as a ratio between `0` and `1`)

`gpu_memory` and `gpu_usage` will only be set if the [Nvidia Management Library](https://developer.nvidia.com/nvidia-management-library-nvml) and its headers is present in the system and a compatible acceleration card is installed.

CPU metrics are for all cores combined. If the CPU features more than one core, details will be available like so:
- `cpu_usage{cpu="<index>"}`: how much processing power of this specific core is being used (as a ratio between `0` and `1`)

Indexes are continuous and cores are in the order the OS listed them.

GPU metrics are for all compatible cards combined. If more than one card is recognized, details will be available like so:
- `gpu_memory{gpu="<index>"}`: how much memory of this specific GPU is being used (as a ratio between `0` and `1`)
- `gpu_usage{gpu="<index>"}`: how much processing power of this specific GPU is being used (as a ratio between `0` and `1`)

Indexes are determined by the [Nvidia Management Library](https://developer.nvidia.com/nvidia-management-library-nvml) and may not be continuous.

## Handlers

A handler is special kind of option that is a function. If provided, it is called:
- when the corresponding route is requested (`health` and `ready`)
- every _period_ seconds when metrics are computed internally (`metrics`)

Handlers _can_ be _asynchronous_.

### `health: () => void`

The health handler just has to complete execution. To notify the server is unhealthy, throw an exception with a sensible error message.

Example:

```js
healthCheck.createServer( {
    "health": () => {
        if ( somethingWrong() ) {
            throw new Error( `something is wrong` );
        }
    },
} );
```

### `metrics: () => object`

This handler should return an `object` containing custom metrics.

Property names will be converted from camel-case to snake-case when needed.

If a property name starts with the hash symbol (`#`) then it is considered as a _cumulative counter_: only its latest, more current value will be used, no percentile shenanigans will be attempted.

Example:

```js
healthCheck.createServer( {
    "metrics": () => ( {
        "#myCount": 16,
        "myMetric": Math.random(),
    } ),
} );
```

will have `/metrics` output something akin to

```
cpu_memory 0.217
cpu_usage 0.338
gpu_memory 0.02
gpu_usage 0
my_count 16
my_metric 0.502
```

Custom metrics must be pure numbers: strings convertible to numbers will be ignored.

If an exception is raised in the `metrics` handler, it is silenced and ignored.

### `ready: () => boolean`

If the server is ready, return `true`. If not, return `false`.

Example:

```js
const somethingSlowToStart = new SomethingSlowToStart();

healthCheck.createServer( {
    "ready": () => somethingSlowToStart.isReady(),
} );
```


If `false` is returned then `/ready` will issue a `503` with `NOT READY` as a body.

If an exception is thrown then `/ready` will issue a `503` with the exception message as a body,

## Options

| name | type | default | description |
|-|-|-|-|
| `cpu` | `boolean` | `true` | set to `false` so as not to compute nor output CPU metrics |
| `gpu` | `boolean` | `true` | set to `false` so as not to compute nor output GPU metrics |
| `health` | `function` | `undefined` | health handler |
| `keepAlive` | `number` | `60` | keep alive timeout for the port of the health check server in seconds |
| `metrics` | `function` | `undefined` | metrics handler |
| `percentile` | `number` or `array<number>` or `string` | `75` | percentile between `1` and `100` of metrics (lowest to highest value), when an array of more than one percentile is provided, metrics will be duplicated with a `p="<percentile>"` label, when a string is provided it must be a space-separated list of values akin to `"25 50 75"` |
| `period` | `number` | `2` | period of a tick in seconds (minimum `0.5`), metrics handler has half that time to respond unless `timeout` is lower and not `0` |
| `port` | `number` | `8080` | port number listened to by the health check server |
| `precision` | `number` | `3` | maximum number of digits after the decimal point of metrics values |
| `prefix` | `string` | `undefined` | metrics prefix, for instance if `prefix` is `myapp`, the metrics `cpu_memory` will become `myapp_cpu_memory` |
| `ready` | `function` | `undefined` | ready handler |
| `ticks` | `Number` | `30` | number of ticks (periods of `2` seconds by default) used to assess metrics |
| `timeout` | `number` | `1` | time in seconds handlers have to answer (set to `0` for no timeout) |
| `version` | `string` | `undefined` | what's returned by the `/version` route of the health check server, if falsy (`undefined`, `null`, etc), the `/version` route will issue a `404` |

[license-image]: https://img.shields.io/npm/l/@twicpics/health-check.svg?style=flat-square
[license-url]: https://raw.githubusercontent.com/twicpics/health-check/master/LICENSE
[npm-image]: https://img.shields.io/npm/v/@twicpics/health-check.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@twicpics/health-check
