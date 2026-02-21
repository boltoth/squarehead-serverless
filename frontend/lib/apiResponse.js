const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'X-Requested-With, Content-Type, Accept, Origin, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Expose-Headers': 'Content-Disposition, Content-Type, Content-Length',
};

export function json(res, status, body) {
  res.setHeader('Content-Type', 'application/json');
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));
  res.status(status).end(JSON.stringify(body));
}

export function success(res, data = null, message = null, status = 200) {
  const body = { status: 'success' };
  if (data !== null) body.data = data;
  if (message !== null) body.message = message;
  json(res, status, body);
}

export function error(res, message, status = 400, errors = null, data = null) {
  const body = { status: 'error', message };
  if (errors != null) body.errors = errors;
  if (data != null) body.data = data;
  json(res, status, body);
}

export function notFound(res, message = 'Resource not found') {
  error(res, message, 404);
}

export function validationError(res, errors, message = 'Validation failed') {
  error(res, message, 422, errors);
}
