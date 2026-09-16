const http = require('http');

async function test() {
  const url = `http://public.api.careerjet.net/search?locale_code=it_IT&keywords=sviluppatore&location=milano&affid=22222222222222222222222222222222&user_ip=34.96.39.181&user_agent=curl`;
  console.log("Fetching", url);
  try {
    const res = await fetch(url, { headers: { 'Referer': 'https://example.com' } });
    console.log("Status:", res.status);
    console.log("Text:", await res.text());
  } catch (e) {
    console.error(e);
  }
}
test();
