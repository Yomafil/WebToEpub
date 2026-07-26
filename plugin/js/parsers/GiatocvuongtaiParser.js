parserFactory.register("giatocvuongtai.com", () => new GiatocvuongtaiParser());

class GiatocvuongtaiParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let storyIdentifierContainer = dom.querySelector("astro-island[props]");
        let props = JSON.parse(storyIdentifierContainer.getAttribute("props"));
        let initialStoryIdentifier = props.initialStoryIdentifier?.[1];

        let options = {
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json",
            }
        };

        let targetUrl = new URL(`https://giatocvuongtai.com/api/public/story/${encodeURIComponent(initialStoryIdentifier)}.json`);

        targetUrl.searchParams.set("v", String(Date.now()));

        let chapterListJson = (await HttpClient.fetchJson(targetUrl.toString(), {fetchOptions: options})).json;

        let storyId = chapterListJson.data.id;

        let chapterLinks = chapterListJson.data.chapters.map((chapter) => {
            return {
                sourceUrl: `https://giatocvuongtai.com/reader/?storyId=${storyId}&chapter=${chapter.id}`,
                title: chapter.title,
                isIncludeable: !chapter.is_password_protected,
            };
        });

        return chapterLinks;
    }

    async fetchChapter(url) {
        let parsedUrl = new URL(url);
        let chapterId = parsedUrl.searchParams.get("chapter");

        let options = { 
            parser: this,
            method: "GET",
            credentials: "include",
            headers: {
                "Accept": "application/json",
            }
        };

        let targetUrl = new URL(`https://giatocvuongtai.com/api/public/chapter/${encodeURIComponent(chapterId)}.json`);

        targetUrl.searchParams.set("v", String(Date.now()));
        
        let chapterJson = (await HttpClient.fetchJson(targetUrl.toString(), {fetchOptions: options})).json;

        return this.buildChapter(chapterJson, url);
    }

    buildChapter(chapterJson, url) {
        let newDoc = Parser.makeEmptyDocForContent(url);

        let title = newDoc.dom.createElement("h2");
        title.textContent = chapterJson.data.title;

        newDoc.content.appendChild(title);

        chapterJson.data.content.blocks.forEach((block) => {
            if (block.type === "paragraph") {
                let p = newDoc.dom.createElement("p");

                p.textContent = block.inline.map(item => item.text).join("");

                newDoc.content.appendChild(p);
            }
        });

        return newDoc.dom;
    }

    findContent(dom) {
        return dom.querySelector("div");
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".detail-title");
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("span.story-detail__tag")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".detail-summary").textContent.trim();
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".detail-cover-frame");
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".detail-summary")];
    }
}