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
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch sitemap: ${response.status}`);

    const xml = await response.text();
    const dom = new JSDOM(xml, { contentType: "text/xml" });
    const urls = [...dom.window.document.getElementsByTagName("loc")].map(node => node.textContent);

    return { statusCode: 200, body: JSON.stringify({ urls }) };
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
    const response = await fetch(url, { redirect: "manual" });
    return { statusCode: 200, body: JSON.stringify({
        status: response.status,
        redirected: response.status >= 300 && response.status < 400,
        location: response.headers.get("location") || "No redirect"
    }) };
}
