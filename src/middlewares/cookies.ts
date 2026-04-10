import  Jwt from 'jsonwebtoken';
import { serialize } from 'cookie';
import type { NextFunction, Request, Response } from 'express';
import { getUserByEmail } from '../DB/queries/users';
import { Logger } from '../DB/queries/Logger';

export enum eAccessGranted {
  Granted = "is granted",
  NotAllowed = "not allowed"
}

interface IPayloadArgs{
  email:string,
  user_id:string,
  name:string,
  role:string,
  accessGranted:eAccessGranted
  // credits:number, DB will be the only source of true
}

export interface IPayload extends IPayloadArgs{
  ValidFrontEnd:string,
  renewCookieAfter:string
  iat:number,
}

export const generateAndSerializeToken = (args:IPayloadArgs):string=>{

  const now = new Date();
  const renewCookieAfter = new Date(now);//copy to prevent mutation
  // renewCookieAfter.setHours(now.getHours() + 25); 
  renewCookieAfter.setSeconds(now.getSeconds() + 5);  //for testing

  const payload:IPayload = {
    email:args.email,
    accessGranted:args.accessGranted, 
    user_id:args.user_id.toString(),
    name:args.name,
    role:args.role,
    ValidFrontEnd:"ValidFrontEnd",
    renewCookieAfter:renewCookieAfter.toISOString(),
    iat: Math.floor(now.getTime() / 1000),  //standard unix 
  };

  const SECRET=process.env.SECRET;
  if(!SECRET){
    throw new Error(`There is no secret for cookies`)
  }
  const token = Jwt.sign(payload,SECRET,{
    expiresIn:'2 Days',
    
  })   

  const serialized= serialize("SessionToken",token,{
    path:"/",
    maxAge: 60*60*24*2, //these are secconds, don't trust anyone telling the opposite
    sameSite:'strict', //prevents cross site request forgery
    secure: process.env.environment=='development'?false:true,  //https only?
    httpOnly: true   
  })

  return serialized;
}

export interface AuthRequest extends Request{
  user?:{
    ValidFrontEnd:string,
    user_id:string
    email:string,
    name:string,
  }
}

export const validateSession = async (req: AuthRequest, res: Response, next: NextFunction) => {

  const denyAccess = () => {
    // For API routes, always return JSON
    console.log(req.path)
    if (req.originalUrl.startsWith('/api')) {
      console.log("denying api")
      res.status(403).json({   
        ok: false,
        message: "Please log in to proceed"
      });
    } else {
      console.log("denying non api")
      // For non-API routes, redirect
      res.redirect('/');
    }
  };

  const token = req.cookies.SessionToken;
  if (!token) {
    Logger.error('','token not found')
    return denyAccess(); 
  }
  try {
    const SECRET=process.env.SECRET||'';
    const payload = Jwt.verify(token, SECRET) as IPayload;
    
    if (!payload || payload?.ValidFrontEnd !== 'ValidFrontEnd') {
      Logger.error('','Payload not found')
      return denyAccess();
    }

    if(payload.accessGranted!==eAccessGranted.Granted){
      console.log("access not granted")
      return denyAccess()
    }

    //This logic is to avoid checking the database everytime
    const today=new Date()
    const renewCookieAfter=new Date(payload.renewCookieAfter)
    console.log(renewCookieAfter)
    if(renewCookieAfter<today){ //requires renewal
      console.log("renewing cookie")
      const user=await getUserByEmail(payload.email)

      if(user==null||user==undefined){
        console.log('User not found')
        denyAccess()
        return
      }

      //renewing cookie
      const newToken=generateAndSerializeToken({
        accessGranted:eAccessGranted.Granted,
        email:user.email,
        name:user.name,
        role:user.role,
        user_id:user.id
      })
      // res.setHeader TO DO
      // Error: Cannot set headers after they are sent to the client
      res.append('Set-Cookie', newToken)
      console.log("cookie has been renewed")
      req.user=payload
      next()
      return

    }
    else{ 
      req.user=payload
      console.log("catching the end")
      next();  // Only call next if validation succeeds
    }
  } catch (error) {
    return denyAccess();
  }
}

export const emptyAndSerializedCookie=serialize("SessionToken","",{
  path:"/",
  maxAge: 0, //this are secconds, don't trust anyone telling the opposite
  sameSite:'strict', //prevents cross site reques forgery
  secure: process.env.environment=='development'?false:true,  //https only
  httpOnly: true   
})

