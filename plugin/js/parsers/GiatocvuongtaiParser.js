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
            if (block.type === "image" && block.image) {
                let figure = newDoc.dom.createElement("figure");
                let img = newDoc.dom.createElement("img");
                img.src = block.image.publicUrl;
                if (block.image.alt) {
                    img.alt = block.image.alt;
                }
                figure.appendChild(img);

                if (block.image.caption) {
                    let figcaption = newDoc.dom.createElement("figcaption");
                    figcaption.textContent = block.image.caption;
                    figure.appendChild(figcaption);
                }
                newDoc.content.appendChild(figure);
                return;
            }

            if (block.type === "paragraph" && block.inline) {
                let runsForCurrentP = [];

                let flush = () => {
                    if (runsForCurrentP.length === 0) {
                        return;
                    }
                    let p = newDoc.dom.createElement("p");
                    runsForCurrentP.forEach((run) => {
                        p.appendChild(this.renderRun(newDoc.dom, run));
                    });
                    newDoc.content.appendChild(p);
                    runsForCurrentP = [];
                }

                block.inline.forEach((item) => {
                    let lines = (item.text || "").replace(/\r\n/g, "\n").replace(/\r/g, "\n").split(/\n+/);

                    lines.forEach((line, i) => {
                        if (i > 0) {
                            flush();
                        }
                        if (line.length > 0) {
                            runsForCurrentP.push({ text: line, marks: item.marks });
                        }
                    });
                });

                flush();
            }
        });

        return newDoc.dom;
    }

    renderRun(dom, run) {
        let node = dom.createTextNode(run.text);
        if (!run.marks || run.marks.length === 0) {
            return node;
        }

        let wrappedNode = node;
        run.marks.forEach((mark) => {
            let tag;
            switch (mark) {
                case "bold":            tag = "strong"; break;
                case "italic":          tag = "em"; break;
                case "underline":       tag = "u"; break;
                case "strikethrough":   tag = "s"; break;
                case "code":            tag = "code"; break;
            }
            let el = dom.createElement(tag);
            el.appendChild(wrappedNode);
            wrappedNode = el;
        });
        return wrapped;
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
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