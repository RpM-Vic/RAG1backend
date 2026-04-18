import { Router } from "express";

import { notifySupportRequest2Discord } from "../services/send-to-discord.js";
import { Logger } from "../DB/queries/Logger.js";
import { CustomError } from "../utils/CustomError.js";

export const supportRouter=Router()

supportRouter.post("/",async (req,res)=>{
  const {email,userMessage}=req.body
  console.log({email,userMessage})
  if(!userMessage){
    const message="The message hasn't been received"
    res.status(400).json({
      message
    })
  }
  const emailFallback=email||""
  try{
    await notifySupportRequest2Discord(userMessage,emailFallback)
    const message="Your message has been received"
    res.json({
      message
    })

  }catch(e){
    if(e instanceof CustomError){
      const message="The server is busy"
      res.status(500).json({
        message
      })
      Logger.error(null,message,e,e.functionName)
    }
  }
})