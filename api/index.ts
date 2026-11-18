import express from 'express';
import { createApiRouter } from '../src/server/apiRouter';

const app = express();
const apiRouter = createApiRouter();

app.use('/api', apiRouter);
app.use('/', apiRouter);

export default app;
