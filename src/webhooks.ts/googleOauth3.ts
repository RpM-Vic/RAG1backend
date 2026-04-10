
// import  {google}  from "googleapis";
// import crypto from 'crypto'

// import express, { Router } from 'express'
// import session from 'express-session';

// const googleClientId=process.env.GOOGLE_CLIENT_ID
// const googleClientSecret=process.env.GOOGLE_CLIENT_SECRET
// const googleRedirectUrl="https://rag-online.com/chat"

// const oauth2Client = new google.auth.OAuth2(
//   googleClientId,
//   googleClientSecret,
//   googleRedirectUrl
// );

// // Access scopes for two non-Sign-In scopes: Read-only Drive activity and Google Calendar.
// const scopes = [
//   'https://www.googleapis.com/auth/drive.metadata.readonly',
//   // 'https://www.googleapis.com/auth/calendar.readonly'
// ];

// // Generate a secure random state value.
// const state = crypto.randomBytes(32).toString('hex');

// // Store state in the session


// // Generate a url that asks permissions for the Drive activity and Google Calendar scope
// const authorizationUrl = oauth2Client.generateAuthUrl({
//   // 'online' (default) or 'offline' (gets refresh_token)
//   access_type: 'offline',
//   /** Pass in the scopes array defined above.
//     * Alternatively, if only one scope is needed, you can pass a scope URL as a string */
//   scope: "",
//   // Enable incremental authorization. Recommended as a best practice.
//   include_granted_scopes: true,
//   // Include the state parameter to reduce the risk of CSRF attacks.
//   state: state
// });

// export const googleRouter=Router()
// googleRouter.get('/authurl',async (req,res)=>{
//   // Property 'state' does not exist on type 'Session & Partial<SessionData>'.ts(2339)
//   res.json({
//     authorizationUrl
//   })
// })


// import url from 'url';

// // Receive the callback from Google's OAuth 2.0 server.
// googleRouter.get('/oauth2callback', async (req, res) => {
//   let q = url.parse(req.url, true).query;

//   if (q.error) { // An error response e.g. error=access_denied
//     console.log('Error:' + q.error);
//   } else if (q.state !== req.session.state) { //check state value
//     console.log('State mismatch. Possible CSRF attack');
//     res.end('State mismatch. Possible CSRF attack');
//   } else { // Get access and refresh tokens (if access_type is offline)

//     //q.code
//     const tokens=await oauth2Client.getToken("q.code").
//     oauth2Client.setCredentials(tokens);
//     const ticket=await oauth2Client.verifyIdToken({idToken:"",audience:googleClientId})

//     const email=ticket.getPayload()?.email
//     const name=ticket.getPayload()?.name
//   }
// });