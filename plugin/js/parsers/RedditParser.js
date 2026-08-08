"use strict";

parserFactory.registerUrlRule(
    url => RedditParser.urlMeetsSelectionCriteria(url), 
    () => new RedditParser()
);

class RedditParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll("div.wiki a")]
            .filter(RedditParser.IsChapterLink)
            .map(a => util.hyperLinkToChapter(a));
    }

    findContent(dom) {
        return RedditParser.getPost(dom)?.querySelector("[slot='text-body']");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".toc a");
    }

    static IsChapterLink(link) {
        let pathname = new URL(link.href).pathname;
        return pathname.startsWith("/r/HFY/comments/");
    }

    static getPost(dom) {
        return dom.querySelector("main shreddit-post");
    }

    static urlMeetsSelectionCriteria(url) {
        try {
            let parsedUrl = new URL(url);

            //match if url is: reddit.com/r/.*/comments/
            //see `SubredditParser`
            if (!/^\/r\/[^/]+\/comments\/.+/.test(parsedUrl.pathname)) {
                return false; 
            }

            let hostname = parsedUrl.hostname;
            return (hostname === "www.reddit.com" || hostname === "reddit.com");
        } catch (e) {
            return false;
        }
    }

    findChapterTitle(dom) {
        return RedditParser.getPost(dom).querySelector("h1");
    }
}
