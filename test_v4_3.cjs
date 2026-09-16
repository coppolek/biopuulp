const http = require('http');

async function test() {
  const apiKey = "randomapikey"; // or whatever
  const url = `https://search.api.careerjet.net/v4/query?locale_code=it_IT&keywords=sviluppatore&location=milano&affid=22222222222222222222222222222222&user_ip=34.96.39.181&user_agent=curl`;
  try {
    const res = await fetch(url, { headers: { 'Referer': 'https://example.com', 'Authorization': 'Basic ' + Buffer.from(apiKey + ':').toString('base64') } });
    console.log("Status:", res.status);
    console.log("Text:", await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
