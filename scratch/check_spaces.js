const https = require('https');

function checkSpace(spaceId) {
  return new Promise((resolve) => {
    https.get(`https://huggingface.co/api/spaces/${spaceId}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ spaceId, stage: json.runtime?.stage, hardware: json.runtime?.hardware });
        } catch (e) {
          resolve({ spaceId, error: e.message });
        }
      });
    }).on('error', err => resolve({ spaceId, error: err.message }));
  });
}

async function run() {
  const spaces = [
    'stabilityai/TripoSR',
    'radames/TripoSR',
    'dylanebert/TripoSR',
    'TencentARC/InstantMesh',
    'JeffreyXiang/TRELLIS'
  ];
  for (const s of spaces) {
    const res = await checkSpace(s);
    console.log(res);
  }
}

run();
