import type {  IPurchaseMetadata } from "../interfaces.js";
import { CustomError } from "../utils/CustomError.js";

const discordKey = process.env.DISCORD_KEY || '';

export async function notifyPayment2Discord(
  fields: IPurchaseMetadata,
) {
  if (!discordKey.trim() || typeof discordKey !== 'string') {
    const message="invalid discord key"
    throw new CustomError(message,notifySupportRequest2Discord.name,discordKey)
  }

  const purchaesFields = [
    { name: 'user_id', value: fields.user_id.toString(), inline: true },
    { name: 'product_id', value: fields.product_id.toString(), inline: true },    
    { name: 'id', value: fields.id.toString(), inline: true },
    { name: 'provider', value: fields.provider.toString(), inline: true },

  ];

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: '‌   ', // Invisible character to ensure the embed is displayed
      embeds: [
        {
          title: 'From rag1',
          color: 33023, // Decimal color code
          fields: purchaesFields, // Use the transformed fields array
          footer: {
            text: 'Some footer here',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  };

  try {
    const response = await fetch(discordKey, options);
    if (!response.ok) {
      throw new CustomError("Discord didn't accept the request",notifySupportRequest2Discord.name,response)
    }
    console.log('Message sent to Discord successfully!');
  } catch (error) {
    throw new CustomError("We coudn't contact discord",notifySupportRequest2Discord.name,error)
  }
}


export async function notifySupportRequest2Discord(message:string,email:string) {
  if (!discordKey.trim() || typeof discordKey !== 'string') {
    const message="invalid discord key"
    throw new CustomError(message,notifySupportRequest2Discord.name,discordKey)
  }

  const discordFields = [
    { name: 'message', value: message, inline: true },
    { name: 'email', value: email, inline: true },    
  ];

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      content: '‌   ', // Invisible character to ensure the embed is displayed
      embeds: [
        {
          title: 'From ttk',
          color: 33023, // Decimal color code
          fields: discordFields, // Use the transformed fields array
          footer: {
            text: 'Some footer here',
          },
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  };

  try {
    const response = await fetch(discordKey, options);
    if (!response.ok) {
      throw new CustomError("Discord didn't accept the request",notifySupportRequest2Discord.name,response)
    }
    console.log('Message sent to Discord successfully!');
  } catch (error) {
    throw new CustomError("We coudn't contact discord",notifySupportRequest2Discord.name,error)
  }
}