import { command, authenticate } from './api';

const REFRESH_OFFSET = 5;

const SERVICE_ENDPOINT = 'https://api.millnorwaycloud.com/';

class Mill {
  constructor(username, password, opts = {}) {
    this.logger = opts.logger || console;
    this.serviceEndpoint = opts.serviceEndpoint || SERVICE_ENDPOINT;
    this.username = username;
    this.password = password;
    this.authenticating = false;
    this.devices = [];
    this._authenticate();
  }

  async _authenticate() {
    if (!this.authenticating) {
      this.authenticating = true;
      try {
        const auth = await authenticate(this.username, this.password, this.logger, this.serviceEndpoint);
        this.accessToken = auth.idToken;
        this.refreshToken = auth.refreshToken;
        this.authenticating = false;
      } catch (e) {
        this.accessToken = null;
        this.refreshToken = null;
        this.authenticating = false;
        throw e;
      }
    } else {
      while (this.authenticating) {
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      if (!this.accessToken) {
        throw new Error('Authentication failed');
      }
    }
  }

  async _command(commandName, payload, method) {
    while (this.authenticating) {
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    try {
      return await command(this.accessToken, commandName, payload, this.logger, this.serviceEndpoint, method);
    } catch (e) {
      if (e.message.errorCode === 'InvalidAuthTokenError') {
        this.logger.debug('Access token expired, trying to refresh access token');
        try {
          await this._authenticate();
          return await command(this.accessToken, commandName, payload, this.logger, this.serviceEndpoint, method);
        } catch (e) {
          this.logger.error("Couldn't perform command: " + e.message);
          throw e;
        }
      } else {
        this.logger.error("Couldn't perform command: " + e.message);
        throw e;
      }
    }
  }

  async _getLocalDevice(deviceId) {
    let device = this.devices.find((item) => item.deviceId === deviceId);
    if (!device) {
      device = await this.getDevice(deviceId);
    }
    return device;
  }

  async getHomes() {
    const command = 'houses';
    return await this._command(command, null, 'GET');
  }

  async getRooms(homeId) {
    const command = 'houses/' + homeId + '/rooms';
    return await this._command(command, null, 'GET');
  }

  async getIndependentDevices(homeId) {
    const command = 'houses/' + homeId + '/devices/independent?filterDevices=heatersAndSockets';
    return await this._command(command, null, 'GET');
  }

  async getHouseDevicesByType(homeId) {
    const command = 'houses/' + homeId + '/devices/grouped/type';
    return await this._command(command, null, 'GET');
  }

  async getDevice(deviceId) {
    const command = 'devices/' + deviceId + '/data';
    const device = await this._command(command, null, 'GET');

    if (!this.devices.find((item) => item.deviceId === device.deviceId)) {
      this.devices.push(device);
    } else {
      this.devices.map((item) => (item.deviceId === device.deviceId ? device : item));
    }
    return device;
  }

  async setTemperature(deviceId, temperature) {
    const device = await this._getLocalDevice(deviceId);
    const command = '/devices/' + deviceId + '/settings';

    return await this._command(
      command,
      {
        deviceType: device.deviceType.parentType.name,
        enabled: true,
        settings: {
          temperature_normal: temperature,
        },
      },
      'PATCH'
    );
  }

  async setIndependentControl(deviceId, enable) {
    const device = await this._getLocalDevice(deviceId);
    const command = '/devices/' + deviceId + '/settings';

    return await this._command(
      command,
      {
        deviceType: device.deviceType.parentType.name,
        enabled: true,
        settings: {
          operation_mode: enable ? 'control_individually' : 'weekly_program',
        },
      },
      'PATCH'
    );
  }

  async setPower(deviceId, on) {
    const device = await this._getLocalDevice(deviceId);
    const command = '/devices/' + deviceId + '/settings';

    return await this._command(
      command,
      {
        deviceType: device.deviceType.parentType.name,
        enabled: on ? true : false,
        settings: {
          operation_mode: on ? 'control_individually' : 'off',
        },
      },
      'PATCH'
    );
  }
}

export default Mill;
