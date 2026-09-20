import client from './client';

export async function fetchOutlets() {
  const { data } = await client.get('/outlets');
  return data.outlets;
}

export async function fetchProducts() {
  const { data } = await client.get('/products');
  return data.products;
}