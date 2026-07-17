async function test() {
  try {
    const url = `https://api.allorigins.win/get?url=${encodeURIComponent('https://www.amazon.com/s?k=garlic+press')}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log("Length of HTML:", data.contents.length);
    console.log("Contains s-result-item:", data.contents.includes('s-result-item'));
    console.log("Contains CAPTCHA:", data.contents.includes('captcha') || data.contents.includes('CAPTCHA'));
  } catch (err) {
    console.error(err);
  }
}

test();
