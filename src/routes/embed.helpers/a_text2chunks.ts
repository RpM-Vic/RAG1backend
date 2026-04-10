//this thing is still unused

import { verybigfile } from "../../testing/verybigfile"
import { countTokens } from "../../embeding/countTokens"


interface IChunk{
  strings:string[]
  tokens:number
}

export async function text2chunks(text:string):Promise<IChunk>{
  let cumulativeTokens=0
  let cumulativeString=""
  let cumulativeStrings=[]

  
  while(cumulativeTokens>500) {
    //searchfor the next /n . , 
    countTokens(cumulativeString)
    setTimeout(()=>{
      console.log({cumulativeString,cumulativeTokens}) //only for debuggin
    },300)// I would like to see in console the chucks
  }


  return {strings:["",""],tokens:5}
}

console.log(await text2chunks(verybigfile))