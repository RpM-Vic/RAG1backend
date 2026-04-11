import express from 'express'
import cookieParser from 'cookie-parser';

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

const PORT=process.env.PORT??4001
const app =express()

testConnection().catch(err => {
  console.error("DB connection failed:", err);
});

app.use('/api/webhook/stripe', stripeRouter); // ⬅️ Dedicated raw-body before express.json()

//middlewares
app.use(cookieParser());
app.use(express.json());

// app.use('/',pages)
// app.use('/api/auth',[strictJson],authRouter)
// app.use('/api/embedBook',[validateSession],embedBook)
// app.use('/api/books',[strictJson,validateSession],booksRouter)
// app.use('/api/purchase',strictJson,paymentsRouter)
// app.use('/api/chat',validateSession,chatRoutes)
// app.use('/api/support',supportRouter)


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