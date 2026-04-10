import { Router } from "express";
import v2 from 'cloudinary'
import z from "zod";


import { createBook, deleteBookById, getBooksByUserID } from "../DB/queries/books.js";
import type { AuthRequest } from "../middlewares/cookies.js";
import { Logger } from "../DB/queries/Logger.js";
import { CustomError } from "../utils/CustomError.js";

export const booksRouter=Router()

booksRouter.get('/',async (req:AuthRequest,res)=>{
  const user_id=req.user?.user_id
  if(!user_id){
    
  }
  let userBooks=[]
  if(user_id){
    userBooks=await getBooksByUserID(user_id)
  }
  try{
    const freeBooks= await getBooksByUserID("7605f259-27bc-4d3c-8711-6195ab6f415e")
    
    const books=[...freeBooks,...userBooks]
    res.json({
      books,
      message:'books found'
    })
  }
  catch(e){
    if(e instanceof CustomError){
      res.status(409).json({
        message:e.message
      })
      Logger.error(user_id||"unknown user",e.message,e,e.functionName)
    }
    else{
      const message="Internal server error"
      res.status(500).json({
        message
      })
      Logger.error(user_id||"unknown user",message,e)
    }
  }
})

booksRouter.post('/',async (req:AuthRequest,res)=>{
  const user_id=req.user?.user_id
  if(!user_id){
    const message=`You need to log in first`
    res.status(401).json({
      ok:false,
      message
    })
    Logger.error('unknown user_id',message,user_id)
    return
  }
  const {path,title}=req.body
  const inputSchema=z.object({
    path:z.url(),
    title:z.string()
  })

  const inputValidations=inputSchema.safeParse({path,title})

  if(!inputValidations.success){
    const message="Bad request"
    res.status(400).json({
      message
    })
    Logger.error(user_id,message,inputValidations.data)
  }

  try{
    
    const newBook=await createBook({path,
      title,user_id
    })
    res.status(201).json({
      ok:true,
      message:"created succesfully",
      newBook
    })
  }catch(e){
    res.status(409).json({
      message:"couldn't create"
    })
  }

})

booksRouter.delete('/',async(req:AuthRequest,res)=>{
  const user_id=req.user?.user_id
  if(!user_id){
    const message=`You need to log in first`
    res.status(401).json({
      ok:false,
      message
    })
    Logger.warning('unknown user_id',message,user_id)
    return
  }
  const {book_id}=req.body
  const stringSchema=z.string()
  const stringValidations=stringSchema.safeParse(book_id)
  if(!stringValidations.success){
    const message="bad request"
    res.status(400).json({
      message
    })
    Logger.warning(user_id,message,stringValidations)
  }

  const deletedBook=await deleteBookById(book_id)
  res.json({
    message:`book has been deleted`,
    deletedBook
  })
})

booksRouter.post('/file-signature', (req: AuthRequest, res) => {
  const user_id=req.user?.user_id
  if(!user_id){
    const message=`You need to log in first`
    res.status(401).json({
      ok:false,
      message
    })
    Logger.error('unknown user_id',message,user_id)
    return
  }
  const { fileName, size, type } = req.body;

  if (!fileName || !size) {
    const message="Missing file metadata" 
    res.status(400).json({ message});
    Logger.error(user_id,message,{fileName,size,type})
    return;
  }
  
  const max_bytes = 10 * 1024 * 1024;
  if (size > max_bytes) {
    return res.status(400).json({
      message: `File too large. Max size: ${max_bytes / 1024 / 1024}MB`
    });
  }
  
  const allowedMimes = ['application/pdf'];
  if (!allowedMimes.includes(type)) {
    return res.status(400).json({ message: "This type of document is not allowed" });
  }
  
  const timestamp = Math.round(Date.now() / 1000);
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const cloudName = process.env.CLOUD_NAME;

  if (!apiSecret || !apiKey || !cloudName) {
    return res.status(500).json({ message: "Internal server error" });
  }

  const paramsToSign = {
    context: `filename=${encodeURIComponent(fileName)}`,
    timestamp: timestamp,
  };

  const signature = v2.v2.utils.api_sign_request(paramsToSign, apiSecret);
  
  res.json({
    signatureData: {
      apiKey,
      cloudName,
      context: paramsToSign.context,
      max_bytes,
      signature,
      timestamp: paramsToSign.timestamp,
    },
  });
});

