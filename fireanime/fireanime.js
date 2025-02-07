async function searchResults(keyword) {
    try {
        const encodedKeyword = encodeURIComponent(keyword);
        const responseText = await fetch(`https://fireani.me/api/anime/search?q=${encodedKeyword}`);
        const data = await JSON.parse(responseText);
        
        const transformedResults = data.data.map(anime => ({
            title: anime.title,
            image: `https://fireani.me/img/posters/${anime.poster}`,
            href: anime.slug
        }));

        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Fetch error:', error);
        return JSON.stringify([{ title: 'Error', image: '', href: '' }]);
    }
}


async function extractDetails(slug) {
    try {
        const encodedID = encodeURIComponent(slug);
        const response = await fetch(`https://fireani.me/api/anime?slug=${encodedID}`);
        const data = await JSON.parse(response);
        
        const animeInfo = data.data;
        
        const transformedResults = [{
            description: animeInfo.desc || 'No description available', 
            aliases: `Alternate Titles: ${animeInfo.alternate_titles || 'Unknown'}`,  
            airdate: `Aired: ${animeInfo.start ? animeInfo.start : 'Unknown'}`
        }];
        
        return JSON.stringify(transformedResults);
    } catch (error) {
        console.log('Details error:', error);
        return JSON.stringify([{
        description: 'Error loading description',
        aliases: 'Duration: Unknown',
        airdate: 'Aired: Unknown'
        }]);
  }
}

async function extractEpisodes(slug) {
    try {
        const encodedID = encodeURIComponent(slug);
        const response = await fetch(`https://fireani.me/api/anime?slug=${encodedID}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        
        if (!data || !data.data || !Array.isArray(data.data.anime_seasons)) {
            throw new Error("Invalid API response structure");
        }

        const episodes = data.data.anime_seasons.reduce((acc, season, seasonIndex) => {
            const seasonNumber = seasonIndex + 1;  
            const seasonEpisodes = season.anime_episodes || [];

            seasonEpisodes.forEach(episode => {
                const episodeNumber = episode.episode || 0; 
                if (episodeNumber === 0) {
                    console.warn(`Episode number is missing or invalid for slug: ${slug}, season: ${seasonNumber}`);
                }
                const customEpisodeNumber = seasonNumber * 10 + episodeNumber;
                acc.push({
                    href: `${encodedID}&season=${seasonNumber}&episode=${episodeNumber}`,
                    number: customEpisodeNumber
                });
            });

            return acc;
        }, []);

        console.log(episodes);
        return JSON.stringify(episodes);
    } catch (error) {
        console.error('Fetch error:', error.message);
        return JSON.stringify({ error: error.message });
    }    
}

async function extractStreamUrl(id) {
    try {
        const encodedID = `https://fireani.me/api/anime/episode?slug=${id}`;
        const response = await fetch(`${encodedID}`);
        const data = await JSON.parse(response);

        const voeStream = data.data.anime_episode_links.find(link => link.name === 'VOE' && link.lang === 'eng-sub');

        if (voeStream) {
            const newLink = voeStream.link.replace('https://voe.sx/e/', 'https://maxfinishseveral.com/e/');
            const tempHTML = await fetch(newLink);

            const htmlContent = await tempHTML;

            const scriptMatch = htmlContent.match(/var\s+sources\s*=\s*({.*?});/s);
            if (scriptMatch) {
                let rawSourcesData = scriptMatch[1];
                const hlsMatch = rawSourcesData.match(/['"]hls['"]\s*:\s*['"]([^'"]+)['"]/);
                if (hlsMatch) {
                    const hlsEncodedUrl = hlsMatch[1]; 

                    const decodedUrl = atob(hlsEncodedUrl);
                    return decodedUrl;
                } else {
                    console.log('HLS URL not found in the sources data.');
                }
            } else {
                console.log('No sources variable found in the page.');
            }
        }
        return null;
    } catch (error) {
        console.log('Fetch error:', error);
        return null;
    }
}
