const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const validUrl = require("valid-url");

exports.handler = async (event) => {
    const { path, queryStringParameters } = event;
    let url = queryStringParameters.url;

    if (!url || !validUrl.isUri(url)) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL" }) };
    }

    try {
        if (path.includes("fetch-sitemap")) {
            return await fetchSitemap(url);
        }
        if (path.includes("trim-url")) {
            return trimUrl(url);
        }
        if (path.includes("check-redirect")) {
            return await checkRedirect(url);
        }
        return { statusCode: 404, body: JSON.stringify({ error: "Invalid API endpoint" }) };
    } catch (error) {
        return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
    }
};

// 🟢 Fetch Sitemap URLs

async function fetchSitemap(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.status}`);

        const xml = await response.text();
        const dom = new JSDOM(xml, { contentType: "text/xml" });
        const urls = [...dom.window.document.getElementsByTagName("loc")].map(node => ({ url: node.textContent }));

        return {
            statusCode: 200,
            body: JSON.stringify({ body: urls }) // Properly formatted JSON structure
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: JSON.stringify({ error: error.message })
        };
    }
}


// 🔵 Trim URL to Root Domain
function trimUrl(url) {
    try {
        const trimmedUrl = new URL(url).origin;
        return { statusCode: 200, body: JSON.stringify({ trimmedUrl }) };
    } catch (error) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL" }) };
    }
}

// 🟡 Check Redirect Status
async function checkRedirect(url) {
    let redirects = [];
    let currentUrl = url;
    let maxRedirects = 10; // Prevent infinite loops
    let count = 0;

    while (count < maxRedirects) {
        const response = await fetch(currentUrl, { redirect: "manual" });

        if (response.status >= 300 && response.status < 400) {
            let nextLocation = response.headers.get("location");

            if (!nextLocation) break; // No more redirects

            redirects.push(nextLocation);
            currentUrl = nextLocation;
            count++;
        } else {
            break; // Reached final URL
        }
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            originalUrl: url,
            redirectCount: redirects.length,
            redirectChain: redirects,
            finalUrl: currentUrl
        })
    };
}
