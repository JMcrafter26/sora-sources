function searchResults(html) {
  const results = [];
  const filmListRegex = /<div class="col-lg-auto col-md-4 col-6 mb-12">[\s\S]*?<\/div>\s*<\/div>/g;
  const items = html.match(filmListRegex) || [];

  items.forEach((itemHtml) => {
    const titleMatch = itemHtml.match(/<h3 class="entry-title[^>]*>\s*<a href="([^"]+)"[^>]*>([^<]+)<\/a>/);
    const href = titleMatch ? titleMatch[1] : '';
    const title = titleMatch ? titleMatch[2] : '';
    const imgMatch = itemHtml.match(/<img[^>]*data-src="([^"]+)"[^>]*>/);
    const imageUrl = imgMatch ? imgMatch[1] : '';

    if (title && href) {
      results.push({
        title: title.trim(),
        image: imageUrl.trim(),
        href: href.trim(),
      });
    }
  });
  console.log(results);
  return results;
}

function extractDetails(html) {
  const details = [];

  const descriptionMatch = html.match(/<font[^>]*>([\s\S]*?)<\/font>/);
  let description = descriptionMatch ? descriptionMatch[1].trim() : '';

  if (description.includes('<font style="box-sizing:border-box; vertical-align:inherit">')) {
    description = description.replace('<font style="box-sizing:border-box; vertical-align:inherit">', '');
    description = description.replace('</font>', '');
  }

  const languageMatch = html.match(/اللغة : ([^<]+)/);
  let aliases = languageMatch ? languageMatch[1].trim() : 'N/A';

  let airdate = 'N/A';

  details.push({
    description: description,
    alias: aliases,
    airdate: airdate
  });

  console.log(details);
  return details;
}

function extractEpisodes(html) {
  const episodes = [];
  const linkBtnMatches = html.match(/<a[^>]*href=["']([^"']+)["'][^>]*class=["'][^"']*link-btn link-show[^"']*["'][^>]*>/);
  
  if (linkBtnMatches) {
    episodes.push({
      href: linkBtnMatches[1],
      number: "1"
    });
  } else {
    const episodeBlocks = html.match(/<div class="col-lg-6 col">\s*<a href=["']([^"']+)["'][^>]*class=["'][^"']*link-btn link-show[^"']*["'][^>]*>/g);
    if (episodeBlocks) {
      episodeBlocks.forEach((block, index) => {
        const hrefMatch = block.match(/href=["']([^"']+)["']/);
        if (hrefMatch) {
          episodes.push({
            href: hrefMatch[1],
            number: String(index + 1) 
          });
        }
      });
    }
  }
  
  console.log(episodes);
  return episodes;
}

async function extractStreamUrl(html) {
  let stream = null;
  const urlMatch = html.match(/<meta property="og:url" content="([^"]+)"/);
  const isEpisode = urlMatch && urlMatch[1] && urlMatch[1].includes("/episode/");

  if (isEpisode) {
    const linkBtnMatches = html.match(/<a[^>]*class="link-btn link-show[^"]*"[^>]*>[\s\S]*?<\/a>/g);
    let match = null;

    if (linkBtnMatches && linkBtnMatches.length > 0) {
      const hrefMatch = linkBtnMatches[0].match(/href="([^"]+)"/);
      if (hrefMatch && hrefMatch[1]) {
        match = [null, hrefMatch[1]];
      }
    }

    if (match && match[1]) {
      try {
        const shortnerResponse = await fetch(match[1]);
        const shortnerHtml = await shortnerResponse;

        const finalMatch = shortnerHtml.match(/<div class="d-none d-md-block">\s*<a href="([^"]+)"/);

        if (finalMatch && finalMatch[1]) {
          let finalUrl = finalMatch[1].replace("two.akw.cam", "ak.sv");

          const lastResponse = await fetch(finalUrl);
          const lastHtml = await lastResponse;
          const videoMatch = lastHtml.match(/<source\s+src="([^"]+)"\s+type="video\/mp4"/);

          if (videoMatch && videoMatch[1]) {
            stream = videoMatch[1];
          }
        }
      } catch (error) {
        console.error("Error fetching shortener URL:", error);
        return null;
      }
    }
  } else {
    const finalMatch = html.match(/<div class="d-none d-md-block">\s*<a href="([^"]+)"/);
    if (finalMatch && finalMatch[1]) {
      try {
        let finalUrl = finalMatch[1].replace("two.akw.cam", "ak.sv");
        const lastResponse = await fetch(finalUrl);
        const lastHtml = await lastResponse;
        const videoMatch = lastHtml.match(/<source\s+src="([^"]+)"\s+type="video\/mp4"/);

        if (videoMatch && videoMatch[1]) {
          stream = videoMatch[1];
        }
      } catch (error) {
        console.error("Error fetching final URL:", error);
        return null;
      }
    }
  }

  console.log(stream);
  return stream;
}
