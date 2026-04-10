const sample = 1775774532066

const time=new Date(1775774532066).getTime()
console.log(time)

// function isThistimestampOlderThan5minutes(timestamp: number): boolean {
//   const now = Date.now()
//   const fiveMinutesInMs = 5 * 60 * 1000 // 300,000 milliseconds
  
//   // Check if timestamp is older than 5 minutes
//   return now - timestamp > fiveMinutesInMs
// }

// if (isThistimestampOlderThan5minutes(sample)) {
//   console.log("This timestamp is older than 5 minutes ago")
// } else {
//   console.log("This timestamp is within the last 5 minutes")
// }