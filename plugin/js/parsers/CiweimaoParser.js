parserFactory.register("www.ciweimao.com", () => new CiweimaoParser()); //wap.ciweimao.com has a different formating but has the same content as www.ciweimao.com

class CiweimaoParser extends Parser {
    constructor() {
        super();
    }


    async getChapterUrls(dom) {
        // We need to call 'https://www.ciweimao.com/chapter/get_chapter_list_in_chapter_detail' to be sure we get the entire ToC
        // We get the 'book_id' from the url 'www.ciweimao.com/book/book_id'
        // POST : Request : Form data : book_id=book_id&chapter_id=0&orderby=0
        // Response : JSON

        let payload = new FormData();
        payload.append("book_id", this.getBookId(dom));
        payload.append("chapter_id", 0);
        payload.append("orderby", 0);
        let options = {
            method: "POST",
            credentials: "include",
            body: payload
        };
        let newDom = (await HttpClient.wrapFetch("https://www.ciweimao.com/chapter/get_chapter_list_in_chapter_detail", {fetchOptions: options})).responseXML;

        // Because a book can be separated in volumes, we might get multiple ".book-chapter-list" each of them bound in a ".book-chapter-box" with the Volume Title stored in "h4 sub-tit"
        // They also seems to restart the chapter count on new volume, but thats on per book basis and chapters are still properly ordered in the epub.
        let menuWrapper = document.createElement("div");
        let menu = [...newDom.querySelectorAll(".book-chapter-list")];
        menu.forEach(element => menuWrapper.appendChild(element.cloneNode(true)));
        // Not skilled enough to find a better solution then wrapping all of them in a parent element so hyperlinksToChapterList don't throw an error.
        // Will probably get changed if we need to make our own implementation of hyperlinksToChapterList to handle VIP chapters, like QidianParser.

        return util.hyperlinksToChapterList(menuWrapper);
    }

    /*
    static isChapterVIP(chapter){
        // We need to detect if a chapter is prefaced with a ".icon-lock", if it has one, then it's a VIP chapter.
        // Example:  <li class=""> <a href="Chapter URL"> <i class="line"></i><i class='icon-lock'></i>Chapter Title</a></li>

        // We could skip this step for non premium books if we need to, by checking if a book is VIP or FREE from the content tab of the book.
    }

    static linksToChapter(){
        // Gonna grab most of this from QidianParser, because they also need to deal with Premium Chapters.
    }
    */

    getBookId(dom) {
        return dom.baseURI.split("/").pop();
    }

    getChapterId(url) {
        return url.split("/").pop();
    }
    
    extractTitleImpl(dom) {
        // Remove the span element from h1.title, as it includes the author's name.
        let title = dom.querySelector("h1.title");
        let clone = title.cloneNode(true);
        clone.querySelector("span")?.remove();
        return clone;
    }

    findContent(dom) {
        return dom.querySelector("div"); 
        // We can also have images in the encrypted chapter_content.
        // The content is in "#J_BookRead"
    }

    async fetchChapter(url) {
        // We need to call 'https://www.ciweimao.com/chapter/ajax_get_session_code' to get our 'chapter_access_key'
        // We get the 'chapter_id' from the url 'www.ciweimao.com/chapter/chapter_id'
        // POST : Request : Form data : chapter_id=chapter_id
        // Response : JSON : {"code":100000,"chapter_access_key":"chapter_access_key"}

        let chapterId = this.getChapterId(url);

        let payload = new FormData();
        payload.append("chapter_id", chapterId);
        let options = {
            method: "POST",
            credentials: "include",
            headers: {
                "Accept": "application/json, text/javascript, */*; q=0.01",
            },
            body: payload
        };
        let json = (await HttpClient.fetchJson("https://www.ciweimao.com/chapter/ajax_get_session_code", options)).json;

        // We then need to call 'https://www.ciweimao.com/chapter/get_book_chapter_detail_info' to get the 'chapter_content'
        // POST : Request : Form data : chapter_id=chapter_id&chapter_access_key=chapter_access_key
        // Response : JSON : {"code":100000,"rad":401,"encryt_keys":["",""],"chapter_content":"chapter_content"}

        // cheating a bit, we're adding new data to payload and re-using the payload and options
        payload.append("chapter_access_key", json.chapter_access_key);
        json = (await HttpClient.fetchJson("https://www.ciweimao.com/chapter/get_book_chapter_detail_info", options)).json;

        // Huge skill issue here. Might be a naive approach. Not skilled enough to say.
        let chapter_content = document.createElement("div");
        chapter_content.textContent = json?.chapter_content; 
        // 'chapter_content' appears to be undefined, or might be removed along the way, or some other stuff that I don't know about. ¯\_(ツ)_/¯
        // I'm probably just grabbing it wrong.
        return chapter_content;
    }

    

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
        return node; //We need to remove universal book-tip from the book description:（本站郑重提醒: 本故事纯属虚构，如有雷同，纯属巧合，切勿模仿。)
    }
}