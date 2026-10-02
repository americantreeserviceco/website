const cors = require('cors');
const express = require('express');
const { z } = require('zod');

const uuid = z.string().uuid();
const optionalText = (max = 2000) => z.string().max(max).nullable().optional();

const customerSchema = z.object({
  first_name: z.string().trim().min(1).max(100),
  last_name: z.string().trim().min(1).max(100),
  email: z.string().email().max(320).nullable().optional(),
  phone: optionalText(40),
  address_line1: optionalText(200),
  address_line2: optionalText(200),
  city: optionalText(100),
  state: z.string().length(2).nullable().optional(),
  postal_code: optionalText(20),
  notes: optionalText(),
}).strict();

const treeSchema = z.object({
  customer_id: uuid,
  common_name: z.string().trim().min(1).max(150),
  scientific_name: optionalText(200),
  location_description: optionalText(500),
  planted_year: z.number().int().min(1800).max(new Date().getFullYear()).nullable().optional(),
  notes: optionalText(),
}).strict();

const catalogSchema = z.object({
  name: z.string().trim().min(1).max(150),
  scientific_name: optionalText(200),
  description: optionalText(),
  treatment_notes: optionalText(),
}).strict();

const observationCommon = {
  tree_id: uuid,
  observed_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'monitoring', 'treated', 'resolved']).optional(),
  notes: optionalText(),
};

const pestObservationSchema = z.object({
  ...observationCommon,
  pest_id: uuid,
}).strict();

const diseaseObservationSchema = z.object({
  ...observationCommon,
  disease_id: uuid,
}).strict();

const resources = [
  ['customers', customerSchema],
  ['trees', treeSchema],
  ['pests', catalogSchema],
  ['diseases', catalogSchema],
  ['tree-pest-observations', pestObservationSchema],
  ['tree-disease-observations', diseaseObservationSchema],
];

function requireStaff(getUserForToken) {
  return async (req, res, next) => {
    const match = /^Bearer\s+(.+)$/i.exec(req.get('authorization') || '');
    if (!match) return res.status(401).json({ error: 'Authentication required' });

    try {
      const result = await getUserForToken(match[1]);
      const user = result?.data?.user;
      if (result?.error || !user) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }

      const metadata = user.app_metadata || {};
      const isStaff = metadata.role === 'staff'
        || (Array.isArray(metadata.roles) && metadata.roles.includes('staff'));
      if (!isStaff) return res.status(403).json({ error: 'Staff access required' });

      return next();
    } catch {
      return res.status(401).json({ error: 'Invalid or expired access token' });
    }
  };
}

function parseBody(schema, partial = false) {
  return (req, res, next) => {
    const bodySchema = partial ? schema.partial().refine((value) => Object.keys(value).length > 0) : schema;
    const result = bodySchema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({ error: 'Invalid request body', details: result.error.flatten() });
    }
    req.validatedBody = result.data;
    return next();
  };
}

function validId(req, res, next) {
  if (!uuid.safeParse(req.params.id).success) {
    return res.status(400).json({ error: 'Record id must be a UUID' });
  }
  return next();
}

function sendDatabaseError(res, error) {
  if (error?.code?.startsWith('23')) {
    return res.status(409).json({ error: 'Record conflicts with existing data or relationships' });
  }
  return res.status(500).json({ error: 'Database request failed' });
}

function registerCrudRoutes(app, db, path, table, schema) {
  app.get(path, async (_req, res) => {
    const { data, error } = await db.from(table).select('*').order('created_at', { ascending: false }).limit(100);
    if (error) return sendDatabaseError(res, error);
    return res.json({ data });
  });

  app.post(path, parseBody(schema), async (req, res) => {
    const { data, error } = await db.from(table).insert(req.validatedBody).select('*').single();
    if (error) return sendDatabaseError(res, error);
    return res.status(201).json({ data });
  });

  app.get(`${path}/:id`, validId, async (req, res) => {
    const { data, error } = await db.from(table).select('*').eq('id', req.params.id).maybeSingle();
    if (error) return sendDatabaseError(res, error);
    if (!data) return res.status(404).json({ error: 'Record not found' });
    return res.json({ data });
  });

  app.patch(`${path}/:id`, validId, parseBody(schema, true), async (req, res) => {
    const { data, error } = await db.from(table).update(req.validatedBody).eq('id', req.params.id).select('*').maybeSingle();
    if (error) return sendDatabaseError(res, error);
    if (!data) return res.status(404).json({ error: 'Record not found' });
    return res.json({ data });
  });

  app.delete(`${path}/:id`, validId, async (req, res) => {
    const { data, error } = await db.from(table).delete().eq('id', req.params.id).select('id').maybeSingle();
    if (error) return sendDatabaseError(res, error);
    if (!data) return res.status(404).json({ error: 'Record not found' });
    return res.json({ data });
  });
}

function createApp({ db, getUserForToken, allowedOrigins = [] }) {
  if (!db || typeof getUserForToken !== 'function') {
    throw new TypeError('A database client and token verifier are required');
  }

  const app = express();
  app.disable('x-powered-by');
  app.use(cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error('Origin not allowed'));
    },
  }));
  app.use(express.json({ limit: '1mb' }));
  app.get('/health', (_req, res) => res.json({ status: 'ok' }));
  app.use('/api', requireStaff(getUserForToken));

  for (const [path, schema] of resources) {
    registerCrudRoutes(app, db, `/api/${path}`, path, schema);
  }

  app.use((error, _req, res, _next) => {
    if (error instanceof SyntaxError && 'body' in error) {
      return res.status(400).json({ error: 'Malformed JSON body' });
    }
    if (error.message === 'Origin not allowed') {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    return res.status(500).json({ error: 'Internal server error' });
  });

  return app;
}

module.exports = { createApp };