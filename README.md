# Hypercore Rehost Server

Simple server to keep hypercores available.

A CLI to interact with this server is provided at [hypercore-rehost-cli](https://gitlab.com/HDegroote/hypercore-rehost-cli).

Note: if not running on a personal computer, you will almost certainly want to firewall the port this server is running on, as it is an http server without any authentication.

## Install

`npm -g i hypercore-rehost-server`

## Usage

`rehost-server`

By default, the logs are in JSON format.
If you wish them to be human-readable, pipe them into pino-pretty (which needs to be installed):

`rehost-server | pino-pretty`

## Endpoints

See also [example.js](example.js) for examples of how to call the server's endpoints.

#### `GET /`
List all entries directly contained in the rehoster.

Entries are of the from `{key, info?}`.

#### `PUT /<public-key>`
Add the core with the specified public key (in hex) to the rehoster.

Also accepts optional JSON data of form `{ info: <str> }`
#### `DELETE /<public-key>`
Delete the core with the specified public key (in hex) from the rehoster

#### `GET /info`
Returns a JSON with keys `info` and `details`, and string values.

Info contains a summary of the total nr of hosted keys (including recursively hosted ones).

Details contains basic info for all hosted keys (including recursively hosted ones).

## Config

Config variables include:
- CORESTORE_LOC = './rehoster-corestore'
   - The location of the corestore where all cores will be stored
- BEE_NAME = 'rehoster-bee'
   - The name of the hyperbee containing the public keys of all hypercores to be rehosted
- LOG_LEVEL = 'info'
- HOST
  - Address where the server runs (uses express's default if not defined)
- PORT
  - Port where the server runs (uses express's default if not defined)

RC is used to define the config, with application name `REHOST_SERVER`. See [here](https://www.npmjs.com/package/rc) for all config options.

The simplest ones are to either:

#### Pass them on the command line
`rehost-server --PORT 40000 --CORESTORE_LOC './my-loc'`

#### Or to define a .REHOST_SERVERrc file
```
CORESTORE_LOC = 'other-corestore',
BEE_NAME = 'other-bee',
LOG_LEVEL = 'debug'
PORT = 45045
```
