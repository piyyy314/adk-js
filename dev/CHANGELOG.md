# Changelog

## [0.2.6](https://github.com/piyyy314/adk-js/compare/devtools-v0.2.5...devtools-v0.2.6) (2026-06-25)

### Bug Fixes

- resolve TypeScript compilation errors in cli_deploy.ts ([68395b3](https://github.com/piyyy314/adk-js/commit/68395b37d44efee22f7dab2bc318b031ee5968be))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.2.5 to ^0.2.6

## [0.2.5](https://github.com/piyyy314/adk-js/compare/devtools-v0.6.1...devtools-v0.2.5) (2026-05-17)

### Features

- A2A integration: A2A Remote agent ([#190](https://github.com/piyyy314/adk-js/issues/190)) ([c6b75a2](https://github.com/piyyy314/adk-js/commit/c6b75a29683b0bbac98e1e17d811aa958025a11a))
- A2A integration: Add CLI option and serve ADK agents via A2A ([#188](https://github.com/piyyy314/adk-js/issues/188)) ([3897ee9](https://github.com/piyyy314/adk-js/commit/3897ee99df7122b57e4ff2c29b3f6806d6cb1ff4))
- A2A integration: add toA2a util function ([#205](https://github.com/piyyy314/adk-js/issues/205)) ([b7043ab](https://github.com/piyyy314/adk-js/commit/b7043abd2cc5193deb95bdad5cc347d04d56d87d))
- Add ADK CLI version command. ([#115](https://github.com/piyyy314/adk-js/issues/115)) ([871be23](https://github.com/piyyy314/adk-js/commit/871be23acd020571b47129c96cc25730cd2d8e19))
- add database session service ([b3c38fe](https://github.com/piyyy314/adk-js/commit/b3c38feeb006cf40d0c7b71abe3afd052febb9b1))
- **cli:** add "thinking" spinner to agent run commands ([7b29eab](https://github.com/piyyy314/adk-js/commit/7b29eab4f7cd5eaecc69268004fc8704e00c8ec7))
- **cli:** add hints and fix non-TTY behavior ([300689a](https://github.com/piyyy314/adk-js/commit/300689aeea46512dab8d661948d62d53eb263773))
- **cli:** add hints and fix non-TTY behavior ([ff556e6](https://github.com/piyyy314/adk-js/commit/ff556e6f5aee31696961be1cdb206eb8fae9b24e))
- **cli:** add hints to agent creation selection prompts ([d2898c9](https://github.com/piyyy314/adk-js/commit/d2898c976609c317b2fd513b9e424d28ca7292b4))
- export AdkApiServer from @google/adk-devtools package ([#245](https://github.com/piyyy314/adk-js/issues/245)) ([0887e40](https://github.com/piyyy314/adk-js/commit/0887e4082974fb500a67411ded196f31e9d790bf))
- flip ADK CLI to be ESM native instead of CommonJS. ([#113](https://github.com/piyyy314/adk-js/issues/113)) ([1eb443e](https://github.com/piyyy314/adk-js/commit/1eb443eff054bde1aa9e85faaeb08de902620991))
- integrate with ADK conformance tests ([#168](https://github.com/piyyy314/adk-js/issues/168)) ([3a7c012](https://github.com/piyyy314/adk-js/commit/3a7c012e035f665dbf200640c10caa6e6dd82aa3))
- keep original **dirname, **filename and import.meta.url value for compiled agent files. ([#254](https://github.com/piyyy314/adk-js/issues/254)) ([db89a42](https://github.com/piyyy314/adk-js/commit/db89a4212000a450b6b197438cb798b4bf294831))
- support Zod v3 and v4. ([#46](https://github.com/piyyy314/adk-js/issues/46)) ([accb7ca](https://github.com/piyyy314/adk-js/commit/accb7ca3bdec1295c81a4966177a2d5ed1103313))

### Bug Fixes

- add missing @clack/prompts exports to cli_create_test mock ([3e8f2a0](https://github.com/piyyy314/adk-js/commit/3e8f2a0c8ac76ec1bb16689dc75a96f2dc6f9fb4))
- Add option to start ADK API server on free random port. ([#197](https://github.com/piyyy314/adk-js/issues/197)) ([b8b92bf](https://github.com/piyyy314/adk-js/commit/b8b92bfb4344c8fd5d66556663c5b35c36511585))
- create spinner per-query and use readline for piped stdin in interactive mode ([8fa7202](https://github.com/piyyy314/adk-js/commit/8fa7202033fb35129d35c52f6bc83c37edeb172f))
- graceful cancellation and isCancel bug in cli_create.ts ([ea7014f](https://github.com/piyyy314/adk-js/commit/ea7014f68a79e90f50f94c236e550c3abeb6649c))
- handle state and state delta request body params in ADK API server. ([#117](https://github.com/piyyy314/adk-js/issues/117)) ([9aeb1f6](https://github.com/piyyy314/adk-js/commit/9aeb1f65c73dd122fdc1256a1fc19f74bdb2cbf3))
- polish CLI UX and help formatting ([50f7a93](https://github.com/piyyy314/adk-js/commit/50f7a93d010291261d10860beb7556482969f700))
- polish CLI UX and help formatting ([488115b](https://github.com/piyyy314/adk-js/commit/488115b16a33c0a17c7299e17f904d722ae6342f))
- polish CLI UX and help formatting ([c79f377](https://github.com/piyyy314/adk-js/commit/c79f377337152a38639dbc3a17fbd0781acfa8b2))
- Print error message when port for ADK API server already in use ([#207](https://github.com/piyyy314/adk-js/issues/207)) ([8164857](https://github.com/piyyy314/adk-js/commit/816485786940daefded405731fe776170df80efb))
- replace process.exit(0) with graceful return in cli_create.ts and fix isCancel bug ([5d73349](https://github.com/piyyy314/adk-js/commit/5d733491e7b212520422bbfa43430adb7bd35ce1))
- spinner per-query in input-file mode and readline for piped stdin in interactive mode ([b99e9ae](https://github.com/piyyy314/adk-js/commit/b99e9ae3264ed7c5261dd478cf2eb44d1ffe326d))
- support native addon agent deps ([#219](https://github.com/piyyy314/adk-js/issues/219)) ([a13ee82](https://github.com/piyyy314/adk-js/commit/a13ee8244fb9d843a4123732ab5c28bbc49aeb7a))

### Miscellaneous Chores

- support release-please for release automation ([2c55c5d](https://github.com/piyyy314/adk-js/commit/2c55c5d09f56b18f7adea61d0106c7f77112bde1))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.6.1 to ^0.2.5

## [0.6.1](https://github.com/google/adk-js/compare/devtools-v0.6.0...devtools-v0.6.1) (2026-03-30)

### Bug Fixes

- support native addon agent deps ([#219](https://github.com/google/adk-js/issues/219)) ([a13ee82](https://github.com/google/adk-js/commit/a13ee8244fb9d843a4123732ab5c28bbc49aeb7a))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.6.0 to ^0.6.1

## [0.6.0](https://github.com/google/adk-js/compare/devtools-v0.5.0...devtools-v0.6.0) (2026-03-23)

### Features

- A2A integration: A2A Remote agent ([#190](https://github.com/google/adk-js/issues/190)) ([c6b75a2](https://github.com/google/adk-js/commit/c6b75a29683b0bbac98e1e17d811aa958025a11a))
- A2A integration: Add CLI option and serve ADK agents via A2A ([#188](https://github.com/google/adk-js/issues/188)) ([3897ee9](https://github.com/google/adk-js/commit/3897ee99df7122b57e4ff2c29b3f6806d6cb1ff4))
- A2A integration: add toA2a util function ([#205](https://github.com/google/adk-js/issues/205)) ([b7043ab](https://github.com/google/adk-js/commit/b7043abd2cc5193deb95bdad5cc347d04d56d87d))

### Bug Fixes

- Add option to start ADK API server on free random port. ([#197](https://github.com/google/adk-js/issues/197)) ([b8b92bf](https://github.com/google/adk-js/commit/b8b92bfb4344c8fd5d66556663c5b35c36511585))
- Print error message when port for ADK API server already in use ([#207](https://github.com/google/adk-js/issues/207)) ([8164857](https://github.com/google/adk-js/commit/816485786940daefded405731fe776170df80efb))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.5.0 to ^0.6.0

## [0.5.0](https://github.com/google/adk-js/compare/devtools-v0.4.0...devtools-v0.5.0) (2026-03-09)

### Features

- integrate with ADK conformance tests ([#168](https://github.com/google/adk-js/issues/168)) ([3a7c012](https://github.com/google/adk-js/commit/3a7c012e035f665dbf200640c10caa6e6dd82aa3))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.4.0 to ^0.5.0

## [0.4.0](https://github.com/google/adk-js/compare/devtools-v0.3.0...devtools-v0.4.0) (2026-02-25)

### Features

- Add ADK CLI version command. ([#115](https://github.com/google/adk-js/issues/115)) ([871be23](https://github.com/google/adk-js/commit/871be23acd020571b47129c96cc25730cd2d8e19))
- add database session service ([b3c38fe](https://github.com/google/adk-js/commit/b3c38feeb006cf40d0c7b71abe3afd052febb9b1))
- flip ADK CLI to be ESM native instead of CommonJS. ([#113](https://github.com/google/adk-js/issues/113)) ([1eb443e](https://github.com/google/adk-js/commit/1eb443eff054bde1aa9e85faaeb08de902620991))

### Bug Fixes

- handle state and state delta request body params in ADK API server. ([#117](https://github.com/google/adk-js/issues/117)) ([9aeb1f6](https://github.com/google/adk-js/commit/9aeb1f65c73dd122fdc1256a1fc19f74bdb2cbf3))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.3.0 to ^0.4.0

## [0.3.0](https://github.com/google/adk-js/compare/devtools-v0.2.5...devtools-v0.3.0) (2026-01-30)

### Features

- support Zod v3 and v4. ([#46](https://github.com/google/adk-js/issues/46)) ([accb7ca](https://github.com/google/adk-js/commit/accb7ca3bdec1295c81a4966177a2d5ed1103313))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.2.5 to ^0.3.0

## [0.2.5](https://github.com/google/adk-js/compare/v0.2.4...devtools-v0.2.5) (2026-01-28)

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.2.4 to ^0.2.5

### Bug Fixes

- Fix bug when ADK web server crashes on agent graph generation ([3c7f28e](https://github.com/google/adk-js/commit/3c7f28e))

### Miscellaneous Chores

- support release-please for release automation ([2c55c5d](https://github.com/google/adk-js/commit/2c55c5d09f56b18f7adea61d0106c7f77112bde1))

## [0.2.4](https://github.com/google/adk-js/compare/v0.2.3...v0.2.4) - 2026-01-16

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.2.3 to ^0.2.4

## [0.2.3](https://github.com/google/adk-js/compare/devtools-v0.2.2...v0.2.3) - 2026-01-15

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.2.2 to ^0.2.3

## [0.2.2](https://github.com/google/adk-js/compare/devtools-v0.2.1...v0.2.2) - 2026-01-08

### Features

- Support -y, --yes options in the ADK CLI create command ([6afe042](https://github.com/google/adk-js/commit/6afe042))
- Add interactive CLI command for creating new agent projects with dependency setup ([d6686e8](https://github.com/google/adk-js/commit/d6686e8))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.2.1 to ^0.2.2

## [0.2.1](https://github.com/google/adk-js/compare/devtools-v0.2.0...v0.2.1) - 2025-12-16

### Changed

- Simplify package READMEs ([4f2d5f4](https://github.com/google/adk-js/commit/4f2d5f4))

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.2.0 to ^0.2.1

## [0.2.0](https://github.com/google/adk-js/compare/devtools-v0.1.3...v0.2.0) - 2025-12-15

### Dependencies

- The following workspace dependencies were updated
  - dependencies
    - @google/adk bumped from ^0.1.3 to ^0.2.0

## [0.1.3] - 2025-11-05

### Features

- Add `adk deploy cloud_run` command to deploy agents to Cloud Run ([9593a85](https://github.com/google/adk-js/commit/9593a85))
- Allow to serve individual files ([c776f88](https://github.com/google/adk-js/commit/c776f88))
- Move devtools build logic to a dedicated build.js script ([088765b](https://github.com/google/adk-js/commit/088765b))
- Add `adk run` command ([91b181d](https://github.com/google/adk-js/commit/91b181d))
- Add `adk api_server` command ([65208d9](https://github.com/google/adk-js/commit/65208d9))
- Implement agent graph server API endpoint ([4dcbeeb](https://github.com/google/adk-js/commit/4dcbeeb))

### Bug Fixes

- Fix tests in dev ([74586cc](https://github.com/google/adk-js/commit/74586cc))
- Fix cli server build issues ([31b9568](https://github.com/google/adk-js/commit/31b9568))

### Changed

- Changes the package name from `@google/adk_cli` to `@google/adk-devtools` ([a581404](https://github.com/google/adk-js/commit/a581404))
- Refactor Agent Loading and CLI Commands ([642251d](https://github.com/google/adk-js/commit/642251d))
- Refactor ADK dev server to use `cors` and built-in Express body parsers ([f35ede9](https://github.com/google/adk-js/commit/f35ede9))
- Rename methods to remove the "Async" suffix ([df8ebab](https://github.com/google/adk-js/commit/df8ebab))
- Add skeleton nodejs/express server + cli to run it ([2de5b16](https://github.com/google/adk-js/commit/2de5b16))
