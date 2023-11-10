import { command, authenticate, refreshToken } from './api';
import spacetime from 'spacetime';

const TOKEN_LIFETIME = 10;

const SERVICE_ENDPOINT = 'https://api.millnorwaycloud.com/';

class Mill {
  constructor(username, password, opts = {}) {
    this.logger = opts.logger || console;
    this.serviceEndpoint = opts.serviceEndpoint || SERVICE_ENDPOINT;
    this.username = username;
    this.password = password;
    this.refreshToken = null;
    this.authenticating = false;
    this.devices = [];
    this._authenticate();
  }

  async _authenticate() {
    if (!this.authenticating) {
      this.authenticating = true;
      try {
        const auth =
          this.refreshToken !== null
            ? await refreshToken(this.refreshToken, this.logger, this.serviceEndpoint)
            : await authenticate(this.username, this.password, this.logger, this.serviceEndpoint);
        this.accessToken = auth.idToken;
        this.refreshToken = auth.refreshToken;
        this.tokenExpire = spacetime.now().add(TOKEN_LIFETIME, 'minute');
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
      if (!this.accessToken || spacetime.now().isAfter(this.tokenExpire)) {
        this.logger.debug('Refreshing token');
        await this._authenticate();
      }
      return await command(this.accessToken, commandName, payload, this.logger, this.serviceEndpoint, method);
    } catch (e) {
      const errorType = JSON.parse(JSON.stringify(e.message));
      if (errorType === 'InvalidAuthTokenError') {
        this.logger.debug('Token expired, trying to refresh tokens');
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
    const device = await this.getDevice(deviceId);
    const command = '/devices/' + deviceId + '/settings';

    return await this._command(
      command,
      {
        deviceType: device.deviceType.parentType.name,
        enabled: device.isEnabled,
        settings: {
          temperature_normal: temperature,
          temperature_in_independent_mode: temperature,
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
          operation_mode: enable
            ? device.roomId === null
              ? 'independent_device'
              : 'control_individually'
            : 'weekly_program',
        },
      },
      'PATCH'
    );
  }

  async setPower(deviceId, on, independentOrIndividualOperationMode) {
    const device = await this._getLocalDevice(deviceId);
    const command = '/devices/' + deviceId + '/settings';

    return await this._command(
      command,
      {
        deviceType: device.deviceType.parentType.name,
        enabled: on ? true : false,
        settings: {
          operation_mode: on ? (independentOrIndividualOperationMode ? (device.roomId === null ? 'independent_device' : 'control_individually') : 'weekly_program') : 'off',
        },
      },
      'PATCH'
    );
  }
}

export default Mill;
