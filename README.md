# TwicPics Health Check

__configurable worker-backed health check server with built-in prometheus metrics for CPU and GPU__

## Install

In the root directory of your NodeJS project, type

`yarn add @twicpics/health-check`

or

`npm add @twicpics/health-check`

depending on the package manager you fancy the most.

## Usage

```js
const healthCheck = require( `@twicpics/health-check` );

healthCheck( handlersAndOptions );
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
- `503` when something went wrong

`/ready` can issue a `503` when not ready as normal behaviour.

Out of the box, `/metrics` provides four metrics:
- `cpu_memory`: how much of the CPU memory is being used (as a ratio between `0` and `1`) 
- `cpu_usage`: how much the CPU was used in the last two seconds (as a ratio between `0` and `1`)
- `gpu_memory`: how much of the GPU memory is being used (as a ratio between `0` and `1`)
- `gpu_usage`: how much the GPU is being used (as a ratio between `0` and `1`)

`gpu_memory` and `gpu_usage` will only be properly set if the [Nvidia Management Library](https://developer.nvidia.com/nvidia-management-library-nvml) and its headers is present in the system and a compatible acceleration card is installed. In any other case, values for both will be set to `-1`.

GPU metrics are for all compatible cards combined. If more than one card is recognized, details will be available like so:
- `gpu<index>_memory`: how much of this specific GPU memory is being used (as a ratio between `0` and `1`)
- `gpu<index>_usage`: how much this specific GPU is being used (as a ratio between `0` and `1`)

Indexes are determined by the [Nvidia Management Library](https://developer.nvidia.com/nvidia-management-library-nvml) and may not be continuous.

If you don't want or need GPU metrics, just set the `gpuMetrics` option to `false`.

## Handlers

When a handler is provided, it is called when the health check server corresponding paths are requested.

Handlers can be asynchronous (`async` or returning a `Promise`).

If an exception is thrown in a handler, the health check server will issue a `503` with the exception message as a body.

### `health: () => void`

The health handler just has to complete execution. To notify the server is unhealthy, throw an exception with a sensible error message.

Example:

```js
healthCheck( {
    "health": () => {
        if ( somethingWrong() ) {
            throw new Error( `something is wrong` );
        }
    },
} );
```

### `metrics: () => object`

This handler should return an `object` containing custom metrics that will be added to the built-in ones.

Attribute names will be converted from camel-case to snake-case if needed.

Example:

```js
healthCheck( {
    "metrics": () => ( {
        "myMetric": 78,
    } ),
} );
```

will have `/metrics` output something akin to

```
cpu_memory 0.21
cpu_usage 0.33
gpu_memory -1
gpu_usage -1
my_metric 78
```

### `ready: () => boolean`

If the server is ready, return `true`. If not, return `false`.

If `false` is returned then `/ready` will issue a `503` with `NOT READY` as a body.

## Options

| name | type | default | description |
|-|-|-|-|
| `keepAlive` | `number` | `60_000` | keep alive timeout for the port of the health check server in milliseconds |
| `gpuMetrics` | `boolean` | `true` | set to false so as not to compute nor output GPU metrics |
| `health` | `function` | `undefined` | health handler |
| `metrics` | `function` | `undefined` | metrics handler |
| `metricsPrefix` | `string` | `undefined` | metrics prefix, for instance if `metricsPrefix` is `myapp`, the metrics `cpu_memory` will become `myapp_cpu_memory` |
| `port` | `number` | `8080` | port number listened to by the health check server |
| `ready` | `function` | `undefined` | ready handler |
| `timeout` | `number` | `1_000` | time in milliseconds main thread handlers have to answer (no timeout is set to `0`) |
| `version` | `string` | `"unknown"` | what's returned by the `/version` route of the health check server |
