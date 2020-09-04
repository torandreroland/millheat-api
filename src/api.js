import sha1 from 'simple-sha1';
import { v4 as uuidv4 } from 'uuid';
import fetchPonyfill from 'fetch-ponyfill';
const { fetch } = fetchPonyfill({});

const REQUEST_TIMEOUT = '300';

const DEFAULT_HEADERS = {
  'Content-Type': 'application/x-zc-object',
  Connection: 'Keep-Alive',
  'X-Zc-Major-Domain': 'seanywell',
  'X-Zc-Msg-Name': 'millService',
  'X-Zc-Sub-Domain': 'milltype',
  'X-Zc-Seq-Id': '1',
  'X-Zc-Version': '1',
};

export const authenticate = async (username, password, logger, endpoint) => {
  const url = endpoint + 'login';
  const method = 'POST';
  const headers = {
    ...DEFAULT_HEADERS,
  };
  const body = JSON.stringify({ account: username, password });
  logger.debug(`request: { method: ${method}, url: ${url}, headers: ${JSON.stringify(headers)}, body: ${body} }`);
  const response = await fetch(url, {
    method,
    headers,
    body,
  });
  const json = await response.json();
  logger.debug(`response: ${JSON.stringify(json)}`);
  if (response.ok && !json.error) {
    json.tokenExpire = json.tokenExpire.replace(' ', 'T');
    return json;
  } else {
    throw new Error(`errorCode: ${json.errorCode}, error: ${json.error}, description: ${json.description}`);
  }
};

export const command = async (userId, token, command, payload, logger, endpoint) => {
  const url = endpoint + command;
  const method = 'POST';
  const nonce = uuidv4().replace(/-/g, '').toUpperCase().substring(0, 16);
  const timestamp = Math.round(new Date().getTime() / 1000);
  const signature = sha1.sync(REQUEST_TIMEOUT + timestamp + nonce + token);
  const body = JSON.stringify(payload);
  const headers = {
    ...DEFAULT_HEADERS,
    'X-Zc-Timestamp': timestamp,
    'X-Zc-Timeout': REQUEST_TIMEOUT,
    'X-Zc-Nonce': nonce,
    'X-Zc-User-Id': userId,
    'X-Zc-User-Signature': signature,
    'X-Zc-Content-Length': body.length,
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
    throw new Error(`error: { errorCode: ${json.errorCode}, error: ${json.error}, description: ${json.description} }`);
  }
};
