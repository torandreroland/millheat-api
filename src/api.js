import sha1 from 'simple-sha1';
import { v4 as uuidv4 } from 'uuid';
import fetchPonyfill from 'fetch-ponyfill';
import spacetime from 'spacetime';
const { fetch } = fetchPonyfill({});

const REQUEST_TIMEOUT = '300';

const DEFAULT_HEADERS = {
  'Accept': 'application/json',
  'Content-Type': 'application/json'
};

export const authenticate = async (username, password, logger, endpoint) => {
  const url = endpoint + '/customer/auth/sign-in';
  const method = 'POST';
  const headers = {
    ...DEFAULT_HEADERS,
  };
  const body = JSON.stringify({ login: username, password: password });
  logger.debug(`request: { method: ${method}, url: ${url}, headers: ${JSON.stringify(headers)}, body: ${body} }`);
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  const json = await response.json();
  logger.debug(`response: ${JSON.stringify(json)}`);
  if (response.ok && !json.error) {
    return json;
  } else {
    throw new Error(`errorCode: ${json.error.type}, error: ${json.error}, description: ${json.error.message}`);
  }
};

export const command = async (accessToken, command, payload, logger, endpoint, method) => {
  const url = endpoint + command;
  const body = JSON.stringify(payload);
  const headers = {
    ...DEFAULT_HEADERS,
    'Authorization': 'Bearer ' + accessToken,
  };
  logger.debug(`request: { method: ${method}, url: ${url}, headers: ${JSON.stringify(headers)}, body: ${body} }`);
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  let json;
  try {
    json = await response.json();
  } catch (e) {
    json = {};
  }
  logger.debug(`response: ${JSON.stringify(json)}`);
  if (response.ok && !json.error) {
    return json;
  } else {
    throw new Error(`errorCode: ${json.error.type}, error: ${json.error}, description: ${json.error.message}`);
  }
};
