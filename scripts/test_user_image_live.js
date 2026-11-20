async function testUserImage() {
  const imageUrl = 'https://api.arangtik.com/uploads/img_mwnipp7w_e56fc9.jpg';
  console.log('Downloading user image from:', imageUrl);
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) {
    console.error('Failed to download image:', imgRes.status);
    return;
  }
  const imgBuf = Buffer.from(await imgRes.arrayBuffer());
  console.log('Downloaded bytes:', imgBuf.length);

  const formData = new FormData();
  formData.append('file', new Blob([imgBuf], { type: 'image/jpeg' }), 'test_user_img.jpg');
  formData.append('response_format', 'json');
  formData.append('target_garment', 'all');

  console.log('Posting to https://bg.arangtik.com/api/background-removal ...');
  const t0 = Date.now();
  try {
    const res = await fetch('https://bg.arangtik.com/api/background-removal', {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(120000),
    });
    console.log('Status:', res.status, 'Duration:', (Date.now() - t0) / 1000, 's');
    const text = await res.text();
    console.log('Response:', text);
  } catch (err) {
    console.error('Error:', err.message);
  }
}
testUserImage();
