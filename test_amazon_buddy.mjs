import amazon from 'amazon-buddy';

async function test() {
  try {
    const products = await amazon.products({ keyword: 'garlic press', number: 10, country: 'US' });
    console.log(JSON.stringify(products.result.slice(0, 2), null, 2));
  } catch (err) {
    console.error("Error:", err.message);
  }
}

test();
