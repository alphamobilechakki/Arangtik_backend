const { Client } = require('@gradio/client');

async function testConnection() {
  try {
    console.log('Connecting to stabilityai/TripoSR on Hugging Face...');
    const app = await Client.connect('stabilityai/TripoSR');
    console.log('Connected! View API info:');
    const apiInfo = await app.view_api();
    console.log(JSON.stringify(apiInfo, null, 2));
  } catch (err) {
    console.error('Connection error:', err);
  }
}

testConnection();
