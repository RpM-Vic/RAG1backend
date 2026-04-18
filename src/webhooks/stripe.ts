import express from 'express';
import Stripe from 'stripe';

import { Logger } from '../DB/queries/Logger.js';
import { notifyPayment2Discord } from '../services/send-to-discord.js';
import { IPurchaseMetadataSchema, type IPurchaseMetadata } from '../interfaces.js';
import { addCredits, getPurchaseOptions, registerPurchase } from '../DB/queries/payments.js';
import { CustomError } from '../utils/CustomError.js';

export const stripeRouter = express.Router();

const stripe_apiKey = process.env.stripe_apiKey||"";
const stripe = new Stripe(stripe_apiKey);

stripeRouter.post(
  '/',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    
    //https://dashboard.stripe.com/test/workbench/webhooks/create
    console.log('webhook reached');

    if (stripe_apiKey=="") {
      const message = 'Stripe not configured';
      console.error(message);
      res.status(500).json({ ok: false, message });
      return;
    }
    
    const sig = req.headers['stripe-signature'];
    // console.log({sig})
    //correct till here
    //t=xxx,v1=yyy,v0=zzz
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if(webhookSecret==undefined){
      const message=`There was an error on our side`
        res.status(500).json({
        ok: false,
        message
      });
      Logger.error(null,message,{webhookSecret})
      return;
    }

    if (!sig) {
      res.status(400).json({
        ok: false,
        message: 'No stripe signature provided',
      });
      return;
    }


    let event = req.body;
    /* 
    gotten

    <Buffer 7b 0a 20 ...
    
    */

    try {
      event = await stripe.webhooks.constructEventAsync(req.body, sig, webhookSecret);

      const session = event.data.object;
      console.log({session})
      //this thing has only strings
      const metadata = session.metadata as IPurchaseMetadata; 
      console.log({ metadata });

      const metadataValidation=IPurchaseMetadataSchema.safeParse(metadata)
      if(!metadataValidation.success){
        throw new CustomError("Server is busy, try again later","stripeWebhook",metadata)
      }


      console.log("flag 1")
      const payment=await registerPurchase({
        product_id:metadata.product_id,
        provider:metadata.provider,
        provider_payment_id:metadata.id,
        user_id:metadata.user_id
      })

      const paymentOptions=await getPurchaseOptions()
      const selectedOption = paymentOptions.find(option => option.id === metadata.product_id);
      if (!selectedOption) {
        throw new CustomError("Invalid purchase option","stripe webhook",metadata)
      }


      await addCredits(selectedOption.credits,metadata.user_id,payment.id)
      await notifyPayment2Discord(metadata);
      
      //todo
      //send this in a mail

      console.log('Ignoring event:', event.type);//event.type=charge.succeded
      res.status(200).send();
      return 
      
    } catch (error) {
  
      if (error instanceof Stripe.errors.StripeError) {
        const message= `Stripe error: ${error.message}`
        res.status(400).json({
          ok: false,
          message,
        });
        Logger.error(null,message,error,"stripe webhook")
        return;
      }

      if(error instanceof CustomError){
        res.status(500).json({
          message:error.message
        })
        Logger.error(null,error.message,error,error.functionName)
        return
      }
      const message=`Internal error`

      res.status(500).json({
        ok: false,
        message
      });
      Logger.error(null,message,error,"stripe webhook")
      return;
    }
  },
);
