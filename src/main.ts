import express from 'express'
import cookieParser from 'cookie-parser';

import { authRouter } from './routes/auth-routes';
import { booksRouter } from './routes/books-routes';
import { chatRoutes } from './routes/chat-routes';
import { embedBook } from './routes/embed-routes';
import { pages } from './routes/pages-routes';
import { paymentsRouter } from './routes/payments-routes';
import { rateLimiter, authRateLimit, supportRateLimit } from './middlewares/rate-limit';
import { strictJson } from './middlewares/size-limiter';
import { stripeRouter } from './webhooks.ts/stripe';
import { testConnection } from './DB/dbConnection'
import { validateSession } from './middlewares/cookies';
import { supportRouter } from './routes/support-routes';

const PORT=process.env.PORT
const app =express()

testConnection().catch(err => {
  console.error("DB connection failed:", err);
});

app.use('/api/webhook/stripe', stripeRouter); // ⬅️ Dedicated raw-body before express.json()

//middlewares
app.use(cookieParser());
app.use(express.json());

app.use('/',pages)
app.use('/api/auth',[strictJson,authRateLimit],authRouter)
app.use('/api/embedBook',[validateSession,rateLimiter],embedBook)
app.use('/api/books',[strictJson,rateLimiter,validateSession],booksRouter)
app.use('/api/purchase',strictJson,paymentsRouter)
app.use('/api/chat',validateSession,chatRoutes)
app.use('/api/support',supportRateLimit,supportRouter)

app.use('*foo',pages)


export default app;

if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀 Server listening on http://localhost:${PORT}`);
  });
}