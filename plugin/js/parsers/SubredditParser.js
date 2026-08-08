"use strict";

parserFactory.registerUrlRule(
    url => SubredditParser.urlMeetsSelectionCriteria(url),
    () => new SubredditParser()
);

class SubredditParser extends Parser {
    constructor() {
        super();

        this.minimumThrottle = 5000;
    }

    static urlMeetsSelectionCriteria(url) {
        try {
            let parsedUrl = new URL(url);

            //match if url is: 
            //reddit.com/r/.*/
            //reddit.com/r/.*/best/
            //reddit.com/r/.*/hot/
            //reddit.com/r/.*/new/
            //reddit.com/r/.*/top/
            //reddit.com/r/.*/rising/
            //`www.` and `/r/.*` works too
            //see `RedditParser`
            let pathPattern = /^\/r\/[^/]+\/?(?:(?:best|hot|new|top|rising)\/?)?$/;

            if (!pathPattern.test(parsedUrl.pathname)) { 
                return false; 
            }

            let hostname = parsedUrl.hostname;
            return (hostname === "www.reddit.com" || hostname === "reddit.com");
        } catch (e) {
            return false;
        } 
    }

    async getChapterUrls(dom) {
        let baseUrl = new URL("https://www.reddit.com/");

        let chapterList = [...dom.querySelectorAll("shreddit-post")];

        let chapters = chapterList.map((el) => {
            return {
                sourceUrl: new URL(el.getAttribute("permalink"), baseUrl).href,
                title: el.getAttribute("post-title"),
                isIncludeable: true,
            };
        });

        return chapters;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("shreddit-title").title;
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("shreddit-title");
        let title = authorLabel?.title;
        if (title) {
            return `r/${title}`;
        }

        return "";
    }

    extractDescription(dom) {
        let header = dom.querySelector("shreddit-subreddit-header");

        return header?.getAttribute("description") ?? "desc failed";
    }

    extractPublisher() {
        return "Reddit";
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1").textContent.trim();
    }

    findCoverImageUrl(dom) { 
        return util.getFirstImgSrc(dom, "subreddit-icon-img-desktop");
    }

    async fetchChapter(url) {
        let options = { parser: this };
        let chapterDom = (await HttpClient.wrapFetch(url, options)).responseXML;

        return this.buildChapter(chapterDom, url);
    }

    buildChapter(dom, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);
        let post = dom.querySelector("shreddit-post");

        // Post Meta //
        let postAuthor = post.getAttribute("author");
        let title = post.getAttribute("post-title");
        let score = post.getAttribute("score");

        // Title
        let heading = newDoc.dom.createElement("h1");
        heading.textContent = title;
        newDoc.content.appendChild(heading);

        // Header //
        let header = newDoc.dom.createElement("p");

        // Author
        let author = newDoc.dom.createElement("strong");
        author.textContent = `u/${postAuthor}`;
        header.appendChild(author);

        // Score
        let scoreText = newDoc.dom.createTextNode(` - Score: ${score}`);
        header.appendChild(scoreText);

        newDoc.content.appendChild(header);

        // Post Content //

        // Video
        let player = dom.querySelector("shreddit-player");
        let source = player?.querySelector("source");

        if (source) {
            let p = newDoc.dom.createElement("p");

            let link = newDoc.dom.createElement("a");
            link.href = source.getAttribute("src");
            link.textContent = "Link to video source.";

            p.appendChild(link);
            newDoc.content.appendChild(p);
        }
        
        // Gallery 
        // TODO: Get all images
        let galleryImage = post.querySelector("gallery-carousel > ul > li > figure > img");

        if (galleryImage) {
            let figure = newDoc.dom.createElement("figure");
            let img = newDoc.dom.createElement("img");

            img.src = galleryImage.getAttribute("src");

            figure.appendChild(img);
            newDoc.content.appendChild(figure);
        }

        // Image
        let image = post.querySelector("#post-image");

        if (image) {
            let figure = newDoc.dom.createElement("figure");
            let img = newDoc.dom.createElement("img");

            img.src = image.getAttribute("src");

            figure.appendChild(img);
            newDoc.content.appendChild(figure);
        }
        
        // Text
        let text = [...post.querySelectorAll("[property='schema:articleBody'] p")];
        text.forEach(el => {
            let p = newDoc.dom.createElement("p");
            p.textContent = el.textContent.trim().replaceAll("\n", "");
            newDoc.content.appendChild(p);
        });

        // Comments
        let template = dom.querySelector("template[for]");
        let comments = [...template.content.querySelectorAll("shreddit-comment")];
        
        if (comments.length > 0) {
            let commentHeading = newDoc.dom.createElement("h2");
            commentHeading.textContent = "Comments Section";
            newDoc.content.appendChild(commentHeading);
        }
        
        let deferredTemplate = template.content.querySelector("#deferred-comments");
        
        if (deferredTemplate) {
            let deferredComments = [...deferredTemplate.content.querySelectorAll("shreddit-comment")];
            comments = [...comments, ...deferredComments];
        }
        // TODO: Get every missing comments from more-comments

        let commentStack = [];

        comments.forEach(com => {
            // Comment
            let comment = newDoc.dom.createElement("section");

            // Comment Meta
            let meta = newDoc.dom.createElement("p");
            let author = com.getAttribute("author");
            let score = com.getAttribute("score");
            let depth = parseInt(com.getAttribute("depth"));

            // Author
            let authorEl = newDoc.dom.createElement("strong");
            authorEl.textContent = `u/${author}`;
            meta.appendChild(authorEl);

            // Score
            let scoreText = newDoc.dom.createTextNode(` - Score: ${score}`);
            meta.appendChild(scoreText);

            comment.appendChild(meta);

            // Content //

            // Content Text
            let content = com.querySelector("[slot='comment']");
            let contentP = newDoc.dom.createElement("p");
            contentP.textContent = content?.textContent?.trim();

            // Content Img
            let contentImg = content.querySelector("img[alt='Comment Image']");

            if (contentImg) {
                let figure = newDoc.dom.createElement("figure");
                let img = newDoc.dom.createElement("img");

                img.src = contentImg.getAttribute("src");

                figure.appendChild(img);
                contentP.appendChild(figure);
            }
            
            comment.appendChild(contentP);

            //Build reply chain
            if (depth === 0) {
                if (newDoc.content.lastChild) {
                    let separator = newDoc.dom.createElement("hr");
                    newDoc.content.appendChild(separator);
                }

                newDoc.content.appendChild(comment);
            } 
            else {
                let parent = commentStack[depth - 1];

                let reply = newDoc.dom.createElement("blockquote");
                reply.appendChild(comment);

                parent.appendChild(reply);
            }

            commentStack.length = depth + 1;
            commentStack[depth] = comment;
        });

        return newDoc.dom;
    }
}