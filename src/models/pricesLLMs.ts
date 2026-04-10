//I need this to be object so it can be indexed
export const llmCentsPerMillionTokens={
  // "gpt-4.1-nano":{model:"gpt-4.1-nano",input:11,output:2.5}, //   $0.11/1M tokens
  // "davinci-002":{model:"davinci-002",input:200,output:200},
  // "llama-3.3-70b-versatile":{model:"llama-3.3-70b-versatile",input:59,output:79},
  "Llama-4-Scout-(17Bx16E)":{model:"Llama-4-Scout-(17Bx16E)",input:11,output:34},
  "text-embedding-3-small":{model:"text-embedding-3-small",input:2}
}

const creditsPerDollar=1000

//https://developers.openai.com/api/docs/pricing
// https://groq.com/pricing

/** 
 * For the second argument use the object llmCentsPerMillionTokens
*/
export function calculateLllmCallPriceInCredits(tokens:number,pricePerMillionTokensInCents:number){
  //1 dollar = 1000 credits
  return Math.round(tokens*pricePerMillionTokensInCents*creditsPerDollar/1000000)
}


/* 

gpt 4.1 nano                                   
1M  tokens            11 cents                  11000           
800 tokens            0.0088  cents               9

1 dollar= 1k credits
1 credit 1mD     1mDollar

*/
