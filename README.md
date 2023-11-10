# millheat-api

Api for communication with Mill heaters

## Installation

```
npm install millheat-api
```

## Usage

```
const Mill = require('millheat-api');
const mill = new Mill('username', 'password', opts);

// opts = {
//    logger: (optional, default: console),
//    serviceEndpoint: (optional, string),
// }

// List homes
const homes = await mill.getHomes();

// List indepenent devices
const independentDevices = await mill.getIndependentDevices(homeId);

// List rooms
const rooms = await mill.getRooms(homeId);

// List devices by type
const room = await mill.getHouseDevicesByType(homeId);

// Get device
const device = await mill.getDevice(deviceId);

// Set temperature
await mill.setTemperature(deviceId, temperature);

// Set independent control
await mill.setIndependentControl(deviceId, enable);

// Set power
await mill.setPower(deviceId, on, independentOrIndividualOperationMode);
```
