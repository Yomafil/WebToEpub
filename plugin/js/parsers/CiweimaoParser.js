parserFactory.register("www.ciweimao.com", () => new CiweimaoParser()); //wap.ciweimao.com as a different formating but has the same content as www.ciweimao.com

class CiweimaoParser extends Parser {
    constructor() {
        super();
    }


    async getChapterUrls() {
        // We need to call 'https://www.ciweimao.com/chapter/get_chapter_list_in_chapter_detail' to be sure we get the entire ToC
        // We get the 'book_id' from the url 'www.ciweimao.com/book/book_id'
        // POST : Request : Form data : book_id=book_id&chapter_id=0&orderby=0
        // Response : JSON

        let menu = dom.querySelector(".book-chapter-list"); 
        return util.hyperlinksToChapterList(menu);
    }

    
    extractTitleImpl(dom) {
        return dom.querySelector("h1.title"); //Need to remove the span element from h1.title, as it includes the author's name.
    }

    findContent(dom) {
        return dom.querySelector("#J_BookRead"); //Content is delivered after the page has loaded, leaving us with a dom with missing chapter content. 
    }

    /*
    async fetchChapter() {
        // We need to call 'https://www.ciweimao.com/chapter/ajax_get_session_code' to get our 'chapter_access_key'
        // We get the 'chapter_id' from the url 'www.ciweimao.com/chapter/chapter_id'
        // POST : Request : Form data : chapter_id=chapter_id
        // Response : JSON : {"code":100000,"chapter_access_key":"chapter_access_key"}

        // We then need to call 'https://www.ciweimao.com/chapter/get_book_chapter_detail_info' to get the 'chapter_content'
        // POST : Request : Form data : chapter_id=chapter_id&chapter_access_key=chapter_access_key
        // Response : JSON : {"code":100000,"rad":401,"encryt_keys":["",""],"chapter_content":"chapter_content"}
    }
    */

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, "span"); //We need to remove the span from every p.chapter.
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