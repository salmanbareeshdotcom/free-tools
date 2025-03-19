const fetch = require("node-fetch");
const { JSDOM } = require("jsdom");
const validUrl = require("valid-url");

exports.handler = async (event) => {
    const { path, queryStringParameters } = event;
    let url = queryStringParameters.url;

    if (!url) {
        return { statusCode: 400, body: JSON.stringify({ error: "No URL provided" }) };
    }

    try {
        if (path.includes("fetch-sitemap")) {
            return await fetchSitemap(url);
        }
        if (path.includes("trim-url")) {
            return handleTrimUrls(url);
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

// 🔵 Handle Trim URL Requests (Single & Bulk)
function handleTrimUrls(urls) {
    // Split into an array if multiple URLs are provided (comma-separated)
    urls = urls.includes(",") ? urls.split(",") : [urls];

    // Trim and validate each URL
    const validUrls = urls
        .map(url => url.trim())
        .filter(url => validUrl.isUri(url));

    if (validUrls.length === 0) {
        return { statusCode: 400, body: JSON.stringify({ error: "Invalid URL(s) provided" }) };
    }

    return trimUrls(validUrls);
}

// 🟡 Get Root Domain
function getRootDomain(url) {
    try {
        const hostname = new URL(url).hostname;
        const parts = hostname.split('.');

        if (parts.length > 2) {
            return parts.slice(-2).join('.'); // Keeps only the last two parts (root domain)
        }
        return hostname;
    } catch (error) {
        return null;
    }
}

// 🔵 Trim URLs to Root Domain
function trimUrls(urls) {
    const results = urls.map(url => {
        const rootDomain = getRootDomain(url);
        return rootDomain
            ? { original: url, trimmed: rootDomain }
            : { original: url, error: "Invalid URL" };
    });

    return { statusCode: 200, body: JSON.stringify(results) };
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
