import { Router } from "express";
import Stripe from "stripe";

import { getPurchaseOptions,} from "../DB/queries/payments.js";
import { Logger } from "../DB/queries/Logger.js";
import { llmCentsPerMillionTokens } from "../models/pricesLLMs.js";
import { validateSession, type AuthRequest } from "../middlewares/cookies.js";
import { getBooksByUserID } from "../DB/queries/books.js";
import { IPurchaseMetadataSchema, type IPurchaseMetadata } from "../interfaces.js";

export const paymentsRouter=Router()

//this route doesn't require the user to sign in
paymentsRouter.get('/options',async(req,res)=>{
  const llmModels=Object.values(llmCentsPerMillionTokens)
  try{
    //this is the user for public access
    const books=await getBooksByUserID("7605f259-27bc-4d3c-8711-6195ab6f415e")
    const purchaseOptions=await getPurchaseOptions()
    res.json({
      ok:true,
      message:`Options delivered`,
      purchaseOptions,
      llmModels,
      books
    })
  }catch(e){
    const message=`Internal error, try again later`
    res.json({
      ok:false,
      message
    })
    Logger.error('unknon user_id',message,e)
  }
})

paymentsRouter.post('/',validateSession,async (req:AuthRequest, res) => {
  const { optionId } = req.body;
  const user_id=req.user?.user_id
  if(!user_id){
    const message=`We couldn't recognize the user`
    res.status(401).json({
      ok:false,
      message
    })
    Logger.error('Unknown user_id',message,user_id)
    return
  }
  
  if (!optionId) {
    return res.status(400).json({
      ok: false,
      message: "optionId is required"
    });
  } 
  
  const paymentOptions=await getPurchaseOptions()
  const selectedOption = paymentOptions.find(option => option.id === optionId);
  if (!selectedOption) {
    const message= 'Invalid optionId. Please select a valid donation option.'
    res.status(400).json({
      ok: false,
      message,
    });
    Logger.error(user_id,message,selectedOption)
    return 
  }

  try {
    const stripe_apiKey = process.env.stripe_apiKey || '';
    const stripe = new Stripe(stripe_apiKey);

    const metadata:IPurchaseMetadata={
      product_id:optionId,
      id:selectedOption.id,
      description:selectedOption.description,
      user_id,
      provider:"stripe"
    }

    const metadataValidation=IPurchaseMetadataSchema.safeParse(metadata)
    if(!metadataValidation.success){
      const message="The server is busy, try again later"
      res.status(500).json({
        message
      })
      Logger.error(user_id,message,metadataValidation)
      return
    }

    const session = await stripe.checkout.sessions.create({
      success_url:'https://www.raglive.com/paysuccess',
      line_items: [
        {
          price_data: {
            currency: selectedOption.currency,
            product_data: {
              name: selectedOption.description,
            },
            unit_amount: selectedOption.price,//stripe needs cents
          },
          quantity: 1,
        },
      ],
      metadata,
      mode:"payment"
    });

    res.status(200).json({
      ok: true,
      message: `Payments take a few minutes to be detected, please wait and refresh`,
      url: session.url,
    });
  } catch (error) {
    const message = `tried to purchase: ${selectedOption.description} ${selectedOption.price}`;
    console.error(message, error);
    res.json({
      ok: false,
      message: 'error when connecting to stripe',
    });
  }
});


/*     
  Successful payment: 4242 4242 4242 4242

  Requires authentication: 4000 0025 0000 3155

  Decline with card_declined: 4000 0000 0000 0002

  Decline with insufficient_funds: 4000 0000 0000 9995

  SCA authentication: 4000 0027 6000 3184
    
*/