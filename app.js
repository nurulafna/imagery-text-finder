const MLY_TOKEN = 'MLY|24088246200826459|d40ca2455b5012aaec0ce75786a8c7ab';

document.getElementById('ocrForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const location = document.getElementById('location').value;
  const searchText = document.getElementById('text').value;
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = 'Processing...';

  try {
    const coords = await getCoordinates(location);
    if (!coords) {
      resultsDiv.innerHTML = 'Location not found.';
      return;
    }

    const images = await getMapillaryImages(coords.lat, coords.lon);
    if (images.length === 0) {
      resultsDiv.innerHTML = 'No images found nearby.';
      return;
    }

    resultsDiv.innerHTML = `<p>Found ${images.length} images.</p>`;

    for (const img of images) {
      const url = img.properties.thumb_256_url;
      if (!url) continue;

      const imgElem = document.createElement('img');
      imgElem.src = url;
      resultsDiv.appendChild(imgElem);

      const text = await extractText(url);
      const match = fuzzyMatch(searchText, text);
      if (match) {
        resultsDiv.innerHTML += `<p><strong>Match found!</strong> Score: ${match.score.toFixed(2)}<br>Image: <a href="${url}" target="_blank">${url}</a></p>`;
      }
    }
  } catch (err) {
    resultsDiv.innerHTML = `Error: ${err.message}`;
  }
});

async function getCoordinates(location) {
  const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
  const data = await response.json();
  if (data.length > 0) {
    return { lat: data[0].lat, lon: data[0].lon };
  }
  return null;
}

async function getMapillaryImages(lat, lon, radius = 100) {
  const url = `https://graph.mapillary.com/images?access_token=${MLY_TOKEN}&fields=id,thumb_256_url&closeto=${lon},${lat}&radius=${radius}`;
  const response = await fetch(url);
  const data = await response.json();
  return data.data || [];
}

async function extractText(imageUrl) {
  const result = await Tesseract.recognize(imageUrl, 'eng', {
    logger: m => console.log(m.status)
  });
  return result.data.text;
}

function fuzzyMatch(input, ocrText, threshold = 0.7) {
  input = input.toLowerCase();
  ocrText = ocrText.toLowerCase();
  const score = computeSimilarity(input, ocrText);
  return score >= threshold ? { score } : null;
}

function computeSimilarity(a, b) {
  let matches = 0;
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i++) {
    if (a[i] === b[i]) matches++;
  }
  return matches / a.length;
}
