async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetchv2(`https://frembed.xyz/api/public/search?query=${encodedKeyword}`);
        //const data = JSON.parse(responseText);
        const data = await responseText.json();
        
        const showsData = data.tvShows.map(show => {
            return {
                title: show.name || show.original_title,
                image: `https://image.tmdb.org/t/p/w500${show.poster_path}`,
                href: `${show.id}`
            }
        });

        //console.log(JSON.stringify(showsData));
        console.log(showsData);

        return JSON.stringify(showsData);
    } catch (error) {
        console.log('Fetch error in searchResults:', error.message);
        return JSON.stringify([{
            title: 'Error',
            image: '',
            href: ''
        }]);
    }
}

async function extractDetails(showId) {
    try {
        const responseText = await fetchv2(`https://frembed.xyz/api/public/tv-show/${showId}`);
        //const data = JSON.parse(responseText);
        const data = await responseText.json();

        const transformedResults = [{
            description: data.overview || 'N/A',
            aliases: data.title || 'N/A',
            airdate: data.year || 'N/A'
        }];

        //console.log(JSON.stringify(transformedResults));
        console.log(transformedResults);

        return transformedResults;
    } catch (error) {
        return null;
    }
}

async function extractEpisodes(showId) {
    try {
        const responseText = await fetchv2(`https://frembed.xyz/api/public/tv-show/${showId}/listep`);
        //const data = JSON.parse(responseText);
        const data = await responseText.json();


        const episodes = data.map(season =>
            season.episodes.map(episode => ({
                number: episode.epi,
                href: `id=${showId}&sa=${season.sa}&epi=${episode.epi}`
            }))
        ).flat();

        console.log(JSON.stringify(episodes));
        //console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        return null;
    }
}

async function extractStreamUrl(url) {
    try {
        const headers = {
            'Referer': 'https://frembed.xyz',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'application/json'
        };

        const responseText = await fetchv2(`https://frembed.xyz/api/series?${url}&idType=tmdb`, headers);

        const data = await responseText.json();
        const embedUrl = data.link3;
        const newEmbedUrl = embedUrl.replace("https://maxfinishseveral.com/e/", "https://heatherwholeinvolve.com/e/");
        console.log(newEmbedUrl);
        const response = await fetchv2(newEmbedUrl);
        const html = await response.text();
        const scriptMatch = html.match(/var\s+sources\s*=\s*({.*?});/s);
        if (scriptMatch) {
            let rawSourcesData = scriptMatch[1];
            const hlsMatch = rawSourcesData.match(/['"]hls['"]\s*:\s*['"]([^'"]+)['"]/);
            if (hlsMatch) {
                const hlsEncodedUrl = hlsMatch[1];

                const decodedUrl = base64Decode(hlsEncodedUrl);
                console.log(decodedUrl);
                return decodedUrl;
            }
            return data;
        }
    } catch (error) {
        console.log('Fetch error in extractStreamUrl:' + error);
        return null;
    }
}

//Credits to @hamzenis for decoder <3
function base64Decode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    let output = '';

    str = String(str).replace(/=+$/, '');

    if (str.length % 4 === 1) {
        throw new Error("'atob' failed: The string to be decoded is not correctly encoded.");
    }

    for (let bc = 0, bs, buffer, idx = 0; (buffer = str.charAt(idx++)); ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer, bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        buffer = chars.indexOf(buffer);
    }

    return output;
}
