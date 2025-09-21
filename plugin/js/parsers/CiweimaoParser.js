parserFactory.register("www.ciweimao.com", () => new CiweimaoParser()); //wap.ciweimao.com as a different formating but has the same content as www.ciweimao.com

class CiweimaoParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector(".book-chapter-list"); //User need to expend chapter list to get the full list. Else they only get the 20 first chapters.
        return util.hyperlinksToChapterList(menu);
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.title"); //Need to extract span from h1 title
    }

    findContent(dom) {
        return dom.querySelector("#J_BookRead"); //Content is delivered after the page has loaded, leaving us with a dom with missing chapter content. 
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "span"); //We need to remove span from every p.chapter, once we manage to get the content
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".read-hd h1");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, "div.cover"); 
    }

    extractLanguage() {
        return "zh-CN"; //html lang is erroneously set to "en" on the website, but the site and books are in chinese.
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector("h1.title > span");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".book-bd")];
    }

    cleanInformationNode(node) {
        return node; //We need to remove universal site warning from book description:（本站郑重提醒: 本故事纯属虚构，如有雷同，纯属巧合，切勿模仿。)
    }
}