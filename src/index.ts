import express from 'express'
import cookieParser from 'cookie-parser';
import cron from 'node-cron'

import { authRouter } from './routes/auth-routes.js';
import { booksRouter } from './routes/books-routes.js';
import { chatRoutes } from './routes/chat-routes.js';
import { embedBook } from './routes/embed-routes.js';
import { pages } from './routes/pages-routes.js';
import { paymentsRouter } from './routes/payments-routes.js';
import { rateLimiter, authRateLimit, supportRateLimit } from './middlewares/rate-limit.js';
import { strictJson } from './middlewares/size-limiter.js';
import { stripeRouter } from './webhooks/stripe.js';
import { testConnection } from './DB/dbConnection.js'
import { validateSession } from './middlewares/cookies.js';
import { supportRouter } from './routes/support-routes.js';
import { deleteOldLogs } from './DB/queries/Logger.js';

const PORT=process.env.PORT??4001
const app =express()

testConnection().catch(err => {
  console.error("DB connection failed:", err);
});

cron.schedule('0 2 1 * *', () => {
    console.log('Monthly log cleanup started');
    deleteOldLogs();
});

app.use('/api/webhook/stripe', stripeRouter); // ⬅️ Dedicated raw-body before express.json()

//middlewares
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api/auth',[strictJson,authRateLimit],authRouter)
app.use('/api/embedBook',[validateSession,rateLimiter],embedBook)
app.use('/api/books',[strictJson,rateLimiter,validateSession],booksRouter) 
app.use('/api/purchase',strictJson,paymentsRouter)
app.use('/api/chat',validateSession,chatRoutes)
app.use('/api/support',supportRateLimit,supportRouter)
app.use('/',pages)
app.use('*foo',pages)


// export default app;

// if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
// }