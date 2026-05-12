import { broadcastLogEvent } from "./wsHub.js";

const clients = new Set();

const writeEvent = (res, { event, data }) => {
  if (event) res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
};

export const addLogStreamClient = (res) => {
  clients.add(res);
};

export const removeLogStreamClient = (res) => {
  clients.delete(res);
};

export const publishLogEvent = (data) => {
  for (const res of clients) {
    try {
      writeEvent(res, { event: "log", data });
    } catch {
      clients.delete(res);
    }
  }

  broadcastLogEvent(data);
};

export const publishPing = () => {
  for (const res of clients) {
    try {
      // SSE comment line (ignored by EventSource) keeps connection warm
      res.write(`: ping\n\n`);
    } catch {
      clients.delete(res);
    }
  }
};

export const getConnectedClientCount = () => clients.size;
