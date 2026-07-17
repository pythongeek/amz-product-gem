async function test() {
  try {
    const params = new URLSearchParams({
      url: 'https://www.amazon.com/s?k=garlic+press',
      prerender: 'true',
      meta: 'false',
      'data.items.selector': 'div[data-component-type="s-search-result"]',
      'data.items.type': 'collection',
      'data.items.attr.asin.selector': '',
      'data.items.attr.asin.attr': 'data-asin',
      'data.items.attr.title.selector': 'h2 a span',
      'data.items.attr.price.selector': '.a-price .a-offscreen',
      'data.items.attr.rating.selector': '.a-icon-alt',
      'data.items.attr.reviewCount.selector': 'span.a-size-base.s-underline-text',
      'data.items.attr.imageUrl.selector': 'img.s-image',
      'data.items.attr.imageUrl.attr': 'src'
    });

    const response = await fetch(`https://api.microlink.io?${params.toString()}`);
    const data = await response.json();
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.error(err);
  }
}

test();
