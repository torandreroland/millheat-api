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
//    accountEndpoint: (optional, string),
// }

// List homes
const homes = await mill.getHomes();

// List indepenent devices
const independentDevices = await mill.getIndependentDevices(home.homeId);

// List rooms
const rooms = await mill.getRooms(home.homeId);

// List devices by room
const room = await mill.getDevicesByRoom(rooms.roomInfo[0].roomId);

// Get device
const device = await mill.getDevice(room.deviceInfo[0].deviceId);

// Set temperature
await mill.setTemperature(deviceId, temperature);

// Set independent control
await mill.setIndependentControl(deviceId, temperature, enable);

// Set power
await mill.setIndependentControl(deviceId, on);
```
