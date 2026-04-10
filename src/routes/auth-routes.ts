import { Router } from "express";
import { z } from 'zod';
import  Jwt from 'jsonwebtoken';
import { hashSync, verifySync } from "@node-rs/bcrypt";

import { createUserAndHashPassword, empytOTPandPasswordBuffer, getUserByEmail, getUserByOTP, setOTPAndPasswordBuffer, swapPasswordBufferedAndPassword } from "../DB/queries/users";
import { Logger } from "../DB/queries/Logger";
import { eAccessGranted, emptyAndSerializedCookie, generateAndSerializeToken, type IPayload } from "../middlewares/cookies";
import { generateId } from "../services/generateId";
import { google } from "googleapis";
import { mailWithOTP } from "../templates/mail";
import { sendEmail } from "../services/sendMail";
import { CustomError } from "../utils/CustomError";

export const authRouter=Router()
const SECRET=process.env.SECRET;

authRouter.post('/signup',async (req,res)=>{
  const{name,email,password}=req.body
  const newUserInput={
    name,
    email,
    password
  }
  // validation
  const newUserInputSchema = z.object({
    name: z.string()
      .trim()
      .max(20, { message: "Name must be 20 characters or less" }),
    email: z.email({ message: "Invalid email format" }),
    password: 
      z.string()
      .min(8, { message: "Password must be at least 8 characters" })
      .regex(/[A-Z]/, { message: "Password must contain at least one uppercase letter" })
      .regex(/[0-9]/, { message: "Password must contain at least one number" })
  })
  const validationResult = newUserInputSchema.safeParse(newUserInput)
  
  const errors=validationResult.error?.issues.map(issue=>{
    return issue.message
  })
  if (!validationResult.success) {
    res.status(400).json({
      ok: false,
      message: validationResult.error?.issues[0]?.message,
    })
    return 
  }

  try{
    const doesUserExist=await getUserByEmail(newUserInput.email)
    if(doesUserExist){
      res.status(409).json({
        ok:false,
        message:`This email has been registred already`
      })
      return
    }

    const newUser=await createUserAndHashPassword(newUserInput)
    const newToken=generateAndSerializeToken({
      accessGranted:eAccessGranted.Granted,
      email:newUser.email,
      name:newUser.name,
      role:newUser.role,
      user_id:newUser.id
    })
    res.setHeader('Set-Cookie', newToken)

    res.status(201).json({
      ok:true,
      message:"New user created",
      newUser
    })
  }catch(e){
    const message=`We couldn't create the new user ${email}`
    res.json({
      ok:false,
      message
    })
    Logger.error("",message,e)
    return
  }
})

authRouter.post('/login',async (req,res)=>{
  const{email,password}=req.body
  const LoginInSchem=z.object({
    email:z.email(),
    password:z.string()
      .min(8, { message: "Password must be at least 8 characters" })
  })

  if(!LoginInSchem.safeParse({email,password}).success){
    const message=`The input is invalid`
    res.status(400).json({
      ok:false,
      message
    })
    Logger.error('unkown user_id',message,{email,password})
    return
  }

  try{
    const user=await getUserByEmail(email)
    if(!user){
      const message=`The email and/or the password is/are not correct`
      res.status(400).json({
        ok:false,
        message
      })
      Logger.error('Unknown user',message,user)
      return
    }
    if(verifySync(password,user.password)){
      const message=`The email and/or the password is/are not correct`
      res.status(400).json({
        ok:false,
        message
      })
      Logger.error('',message,user)
      return
    }

    const newToken=generateAndSerializeToken({
      accessGranted:eAccessGranted.Granted,
      email:user.email,
      name:user.name,
      role:user.role,
      user_id:user.id
    })
    res.setHeader('Set-Cookie', newToken)

    res.json({
      ok:true,
      message:`You are now logged in`
    })
  }catch(e){
    const message=`We couldn't log in ${email}`
    res.json({
      ok:false,
      message
    })
    Logger.error('',message,e)
    return
  }
})

authRouter.get('/logout', async (req, res) => {
  try {
    res.setHeader('Set-Cookie', emptyAndSerializedCookie);
    
    return res.json({
      message: "You are now logged out",
      ok: true
    });
  } catch (error) {
    let userId = 'unknown';
    
    try {
      const token = req.cookies?.SessionToken;
      if (token && SECRET) {
        const payload = Jwt.verify(token, SECRET) as IPayload;
        userId = payload.user_id;
      }
    } catch (verifyError) {
      Logger.warning(userId,'Could not verify token during logout error', verifyError);
    }
    
    const message = `Logout failed`;
    res.status(500).json({ 
      ok: false,
      message: "Logout failed"
    });
    
    Logger.error(userId, message, error);
    return;
  }
});

const googleClientId=process.env.GOOGLE_CLIENT_ID
const googleClientSecret=process.env.GOOGLE_CLIENT_SECRET
const googleRedirectUrl="https://rag-online.com/chat"
const oauth2Client = new google.auth.OAuth2(
  googleClientId,
  googleClientSecret,
  googleRedirectUrl
);

authRouter.post('/google-oauth2',async(req,res)=>{
  const {id_token}=req.body
  if(!id_token){
    res.status(400).json({
      message:"Missing validations"
    })
    return
  }

  try {
    const ticket = await oauth2Client.verifyIdToken({
      idToken: id_token,
      audience: googleClientId,
    });
    const payload = ticket.getPayload();
    if (!payload) {
      res.status(400).json({
        message: 'error',
      });
      return;
    }
    const { email, name, at_hash } = payload;
    if (!email || !name || !at_hash) {
      res.status(400).json({
        message: 'invalid input',
      });
      return;
    }

    //If google users need to log with the email, they will need to change his password
    const password = generateId();


    const newUserInput = {
      password,
      at_hash,
      email,
      name,
    };

    // validation
    const newUserInputSchema = z.object({
      name: z
        .string()
        .trim()
        .max(20, { message: 'Name must be 20 characters or less' }),
      email: z.email({ message: 'Invalid email format' }),
      password: z.string(),
    });
    const validationResult = newUserInputSchema.safeParse(newUserInput);

    if (!validationResult.success) {
      res.status(400).json({
        ok: false,
        message: validationResult.error?.issues[0]?.message,
      });
      return;
    }

    const existingUser = await getUserByEmail(email);
    if (!existingUser) {
      const newUser = await createUserAndHashPassword(newUserInput);
      const newToken = generateAndSerializeToken({
        accessGranted: eAccessGranted.Granted,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        user_id: newUser.id
      });
      res.setHeader('Set-Cookie', newToken);

      res.status(201).json({
        ok: true,
        message: 'New user created',
        newUser,
      });
      return;
    }
    const newToken = generateAndSerializeToken({
      accessGranted: eAccessGranted.Granted,
      email: existingUser.email,
      name: existingUser.name,
      role: existingUser.role,
      user_id: existingUser.id,
    });
    res.setHeader('Set-Cookie', newToken);

    res.status(201).json({
      ok: true,
      message: 'New user created',
      user: existingUser,
    });
  } catch (e) {
    const message = `The server is busy`;
    res.status(500).json({
      ok: false,
      message,
    });
    Logger.error('Unknown user', message, e);
    return;
  }
})


authRouter.post('/forgotten-pass-step-1', async (req, res) => {
  const { email, newPass } = req.body;

  const inputSchema = z.object({
    email: z.email().min(5),
    newPass: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters' })
      .regex(/[A-Z]/, {
        message: 'Password must contain at least one uppercase letter',
      })
      .regex(/[0-9]/, { message: 'Password must contain at least one number' }),
  });

  if (!inputSchema.safeParse(email, newPass).success) {
    const message = 'Invalid email format';
    res.status(400).json({
      message,
    });
    return;
  }

  try {
    const user = await getUserByEmail(email);

    if (!user) {
      const message = 'This user is not registred, please sign up';
      res.status(409).json({
        message,
      });
      return;
    }
    const OTP = generateId();
    const paswordHashed = hashSync(newPass);

    await setOTPAndPasswordBuffer(user.id, OTP, paswordHashed);

    const mailbody = mailWithOTP(OTP);

    await sendEmail(user.email, 'Password recovery', mailbody);

    res.json({
      message:`We send you an email to: ${user.email}, don't forget to check the spam folder`
    })

  } catch (e) {
    if (e instanceof CustomError) {
      const message = 'The server is busy, try again later';
      res.status(500).json({
        message,
      });
      Logger.error(email, message, e, e.functionName);
      return;
    }
    const message = 'The server is busy, try again later';
    res.status(500).json({
      message,
    });
    Logger.error(email, message, e);
  }
});

authRouter.get('/forgotten-pass-step-2/:OTP',async(req,res)=>{
  const { OTP } = req.params;
  const OTPSchema=z.string().min(12)
  if(!OTPSchema.safeParse(OTP).success){
    const message="OTP is invalid"
    res.status(401).json({
      message
    })
    Logger.error(`OTP= ${OTP}`,message,OTP)
  }
  
  try{

  const user=await getUserByOTP(OTP)
  if(!user){
    const message="This user doesn't exists"
    res.status(401).json({
      message
    })
    return
  }
  //unsafe to swap, may not be needed
  if(user.password_buffer.length<5){
    const message="Server is busy"
    res.status(409).json({
      message
    })
    Logger.error(user.id,message,user)
    return 
  }

  const FIFTEEN_MINUTES = 15 * 60 * 1000;
  const now=Date.now()
  const databaseTime=new Date(user.updated_at).getTime()//ms
  if (now- databaseTime > FIFTEEN_MINUTES) {
    const message = "Your session has expired";
    res.status(401).json({ message });
    await empytOTPandPasswordBuffer(user.id)
    return 
  }

  await swapPasswordBufferedAndPassword(user.id,user.password_buffer)
  const message="Your password has been changed successfully"
  res.json(
    message
  )

  }catch(e){
    if(e instanceof CustomError){
      const message="The server is busy"
      res.status(500).json({
        message
      })
      Logger.error(`OTP=${OTP}`,message,e,e.functionName)
      return
    }

    const message="The server is busy"
    res.status(500).json({
      message
    })
    Logger.error(`OTP=${OTP}`,message,e)
    return
  }

})