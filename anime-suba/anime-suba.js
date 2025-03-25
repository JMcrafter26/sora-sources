async function searchResults(keyword) {
    const searchUrl = `https://www.anime-suba.com/search?value=${encodeURIComponent(keyword)}&search=`;
    try {
        const response = await fetchv2(searchUrl);
        const html = await response.text();
        const results = [];
        const stopIndex = html.indexOf('อนิเมะอัพเดทล่าสุด');
        const searchArea = stopIndex !== -1 ? html.substring(0, stopIndex) : html;

        const boxRegex = /<div class="box">([\s\S]*?)<\/div>\s*<\/div>/g;
        let match;

        while ((match = boxRegex.exec(searchArea)) !== null) {
            const itemHtml = match[1];

            const titleMatch = itemHtml.match(/<div class="post_title">([^<]+)<\/div>/);
            const hrefMatch = itemHtml.match(/<a class="pagelink"[^>]+href="([^"]+)"/);
            const imgMatch = itemHtml.match(/<img[^>]+(?:data-)?src="([^"]+)"[^>]*>/);
            const episodeMatch = itemHtml.match(/<span class="badge badge-danger"[^>]*>([^<]+)<\/span>/);

            if (!titleMatch || !hrefMatch || !imgMatch) continue;

            const title = titleMatch[1].trim();
            const href = hrefMatch[1].trim();
            const imageUrl = imgMatch[1].trim();
            const episode = episodeMatch ? episodeMatch[1].trim() : "Unknown Episode";

            results.push({
                title,
                image: imageUrl,
                href,
                episode
            });
        }

        console.log(results);
        return JSON.stringify(results);
    } catch (error) {
        throw error;
    }
}

async function extractDetails(url) {
    const response = await fetchv2(url);
    const html = await response.text();

    const descriptionMatch = html.match(/<div class="summary"><p>.*?<br>([\s\S]*?)<\/p><\/div>/);
    let description = descriptionMatch ? descriptionMatch[1].trim() : `Weirdly the website doesn't provide any description, either that or I'm blind.`;

    description = description.replace(/<\/?br\s*\/?>/gi, '');

    const details = [{
        description,
        alias: 'N/A',
        airdate: 'N/A'
    }];

    console.log(JSON.stringify(details));
    return JSON.stringify(details);
}

async function extractEpisodes(url) {
    const response = await fetchv2(url);
    const html = await response.text();
    const episodes = [];
    const episodeMatches = [...html.matchAll(/<div class="Episode"[^>]*>.*?<a href="([^"]+)">.*?ตอนที่\s*(\d+)/g)];
    
    if (episodeMatches.length > 0) {
      episodeMatches.forEach(match => {
        episodes.push({
          href: match[1].trim(),
          number: parseInt(match[2], 10)
        });
      });
    } else {
      const movieMatch = html.match(/<div class="Episode">.*?<a href="([^"]+)"[^>]*>.*?<\/a>/);
      if (movieMatch) {
        episodes.push({
          href: movieMatch[1].trim(),
          number: 1 
        });
      }
    }
    
    console.log(JSON.stringify(episodes));
    return JSON.stringify(episodes);
   }


async function extractStreamUrl(url) {
    const embedResponse = await fetchv2(url);
    const html = await embedResponse.text();

    const idMatch = html.match(/var\s+url\s*=\s*"https:\/\/www\.anime-suba\.com\/player\/(\d+)"/);

    if (!idMatch) {
        const player2Match = html.match(/var\s+url\s*=\s*"https:\/\/www\.anime-suba\.com\/player2\/(\d+)"/);
        if (player2Match) {
            videoId = player2Match[1];
        } else {
            throw new Error("Video ID not found");
        }
    } else {
        var videoId = idMatch[1];
    }

    const streamUrl = `https://sub-thai.com/stream2/player2/${videoId}.php`;
    const streamResponse = await fetchv2(streamUrl);
    const streamHtml = await streamResponse.text();

    const fileMatch = streamHtml.match(/file:\s*"([^"]+)"/);
    if (!fileMatch) {
        throw new Error("Stream file not found");
    }

    const finalUrl = `https://sub-thai.com/${fileMatch[1].replace(/^(\.\.\/)+/, '')}`;
    console.log(finalUrl);
    return finalUrl;
}
