/**
 * @file This is a reference implementation for how to use ParentTV's Digital Asset Manager. You will need a valid
 * License Key to enable access and functionality from this library.
 * @copyright ParentTV 2022
 * @author Jack Butler <jbutler@parenttv.com>
 * @version 1.1.0
 */

/**
 * Avoiding global conflicts
 * @namespace
 */
const Daniel = {};

Daniel.fetchVideosUrl = "";
Daniel.fetchTopicsUrl = "";

/**
 * Object representations of what to expect from calls to Daniel.
 * @namespace
 */
Daniel.dto = {}

/**
 * A record containing all the data required to present an asset.
 * @type {{new(): Daniel.dto.asset, prototype: asset}}
 * @property {string} ref The UID of the asset
 * @property {string} status One of [created|ready]
 * @property {string} asset_type One of [video|image], typically 'video' in the asset responses we expect here.
 * @property {string} name The name (title) of the asset
 * @property {string} description HTML formatted long-text describing the asset.
 * @property {string} embed An HTML element which can be used to embed the asset in your page.
 * @property {Daniel.dto.contributor[]} contributors People associated with the creation of this asset (e.g. experts, producers, etc)
 * @property {Object.<string, Daniel.dto.relation>} excerpts This field holds data about things like thumbnails and posters
 * @property {Object.<string, Daniel.dto.classification>} groups A set of organisational classifications
 * @property {Object.<string, Daniel.dto.classification>} tags A set of tags related to this asset (used in search)
 * @property {Object.<string, Daniel.dto.classification>} topics A set of topics this asset covers
 * @property {Daniel.dto.language} language The language this asset is delivered in
 * @property {Object.<string, Daniel.dto.relation>} variants For videos, typically language variants
 */
Daniel.dto.asset = class {
    ref;
    status;
    asset_type;
    name;
    description;
    embed;
    contributors;
    excerpts;
    groups;
    language;
    tags;
    topics;
    variants;
}


/**
 * A person or group involved in the creation of an asset.
 * @type {{new(): Daniel.dto.contributor, prototype: contributor}}
 * @property {string} ref UID for this contributor
 * @property {string} name The contributor's name
 * @property {string} bio A brief description of this contributor
 * @property {string} type What type of contributor this is (e.g. expert, videographer, actor, etc)
 * @property {Object.<string, string>} _links Reference links
 * @property {string} _links.assets URL to list assets associated with this contributor
 * @property {string} _links.self URL to this contributor's canonical record
 */
Daniel.dto.contributor = class {
    ref;
    name;
    bio;
    type;
    _links;
}

/**
 * A way to classify and organise assets.
 * @type {{new(): Daniel.dto.classification, prototype: classification}}
 * @property {string} ref The classification's name reference
 * @property {string} description A human readable version of this classification's name
 * @property {Object.<string, string>} _links Reference links
 * @property {string} _links.self URL to this classification's canonical record
 * @property {string} _links.assets URL to list assets associated with this classification
 * @property {string} _links.contributors URL to list contributors associated with this classification
 * @property {string} [_links.groups]
 * @property {string} [_links.tags]
 * @property {string} [_links.topics]
 * @property {string} _links.languages
 */
Daniel.dto.classification = class {
    ref;
    description;
    _links;
}

/**
 * @type {{new(): Daniel.dto.relation, prototype: relation}}
 * @property {string} ref UID of this related asset's record
 * @property {string} type What kind of related asset is this?
 * @property {string} [label] A sub-classing of the relation's type
 * @property {Object.<string, string>} _links
 * @property {string} _links.asset URL to the related asset's record
 * @property {string} _links.stream URL to the related asset's stream data
 */
Daniel.dto.relation = class {
    ref;
    type;
    label;
    _links;
}
Daniel.params = new URLSearchParams('');
Daniel.lang = 'en';

/**
 *
 * @type {Daniel.opts}
 * @property {string} license Your license Key
 * @property {string} lang One of [en, es, hi, ar, zh-cn, zh-hk]
 * @property {string} target The element which will contain the output of this app
 * @property {boolean} search Defines whether the search widget is shown
 * @property {boolean} byTopic Defines whether videos are grouped by Topic
 */
Daniel.opts = class {
    license;
    lang;
    target;
    search;
    byTopic;
}

/**
 * @type {Daniel.app}
 */
Daniel.app = class {
    /**
     * @param {Daniel.opts} opts
     */
    constructor(opts) {
        Daniel.fetchVideosUrl = "https://dam.parenttv.com/assets/" + opts.license;
        Daniel.fetchTopicsUrl = "https://dam.parenttv.com/topics/" + opts.license;
        Daniel.langs = opts.lang ? opts.lang : 'en';
        const queryString = window.location.search;
        Daniel.params = new URLSearchParams(queryString);
        document.addEventListener("DOMContentLoaded", async () => {
            const el = document.getElementById(opts.target);
            const container = document.createElement("div");
            container.className = "daniel-main-container";
            const top = Daniel.createElement({tag: "nav", className: "daniel-nav"});
            const topList = Daniel.createElement({tag: "ul"});
            top.append(topList);
            if (opts.search) {
                new Daniel.searchBar(topList);
            }

            if (Daniel.params.get('player')) {
                this.makePlayer(container, opts, Daniel.params.get('player'));
            } else if (Daniel.params.get('search')) {

                this.doSearch(container, opts, Daniel.params.get('search'));
            } else {
                this.makeListing(container, opts);
            }
            el.append(top, container);
        });
    }

    /**
     * Lists videos either by topic or in a grid
     * @param container
     * @param opts
     */
    makeListing = (container, opts) => {
        if (opts.byTopic) {
            new Daniel.infiniteList(
                container,
                Daniel.fetchTopicsUrl,
                {per_page: 5},
                Daniel.topic,
                true,
                "daniel-container"
            );
        } else {
            new Daniel.infiniteList(
                container,
                Daniel.fetchVideosUrl,
                {types: "video", per_page: 20, langs: Daniel.lang},
                Daniel.videoSummary,
                true,
                "daniel-video-grid"
            )
        }
    }

    /**
     * Creates a video player
     * @param {Element} el The Element where the player will be displayed
     * @param {Daniel.opts} opts
     * @param {string} ref The ID of the video
     */
    makePlayer = (el, opts, ref) => {
        fetch(Daniel.fetchVideosUrl + '/' + ref)
            .then((response) => response.json())
            .then(asset => {
                const wrapper = Daniel.createElement({tag: "div", className: "daniel-player-container"});
                const player = Daniel.createElement({tag: "div", className: "daniel-player", innerHTML: asset.embed});
                const meta = document.createElement("div");
                const title = document.createElement("h4");
                const description = document.createElement("div");
                title.textContent = asset.name;
                description.innerHTML = asset.description;
                meta.append(title, description);
                wrapper.append(player, meta);
                el.append(wrapper);
            });
    }

    /**
     * Fetches search results and appends to `container`
     * @param {Element} container The Element Where the results will be displayed
     * @param {Daniel.opts} opts
     * @param {string} search The search terms
     */
    doSearch(container, opts, search) {
        const tags = search.split(" ");
        new Daniel.infiniteList(
            container,
            Daniel.fetchVideosUrl,
            {types: "video", tags: tags},
            Daniel.videoSummary,
            true,
            "daniel-video-grid"
        );
    }

}
/**
 * @type {Daniel.searchBar}
 * @property {Element} container The DOM Element where this searchbar will be added.
 * @property {Element} form The Form containing the text input and submit button.
 */
Daniel.searchBar = class {
    container = null;
    form = null;

    constructor(container) {
        this.container = container;
        this.form = Daniel.createElement({
            tag: "form",
            onsubmit: this.doSearch(this)
        });
        this.form.append(
            Daniel.createElement({tag: "input", name: "query", type: "text", value: Daniel.params.get('search')}),
            Daniel.createElement({tag: "input", type: "submit", value: "search"})
        );
        const searchbar = Daniel.createElement({tag: "li", className: "daniel-group-link",});
        searchbar.append(this.form);

        this.container.append(searchbar);
    }

    doSearch(search) {
        return (e) => {
            e.preventDefault();
            const term = search.form.elements["query"].value;
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            urlParams.delete('player');
            if (term !== '') {
                urlParams.set('search', term)
            }
            let newLocation = window.location.protocol + '//' + window.location.host + window.location.pathname + '?'
            const vals = []
            urlParams.forEach((val, key) => {
                vals.push(key + '=' + val)
            });
            window.location.href = newLocation + vals.join("&");
        }
    }
}

/**
 * An infinitely extending list (depending on there being further records to display) of results.
 * @type {Daniel.infiniteList}
 * @property {Element} DOMParent The element this list will be appended to.
 * @property {Element} el The HTML representation of this list
 * @property {string|null} fetchNext The URL to retrieve the next n records of this list.
 * @property {object} childClass Identifies which class should be used to create the element displaying a fetched record.
 * @property {boolean} wrap Defines whether this list is displayed as a grid (true) or a line (false).
 */
Daniel
    .infiniteList = class {
    DOMParent = null;
    el = null;
    fetchNext = null;
    childClass;
    count = 0;
    wrap;

    /**
     * Builds an infinite list element, populated by paginated results from Daniel.
     * @param {Element} parent    The container element for the list
     * @param {string} fetchUrl   The base URL of the entity list being retrieved
     * @param {Object<string,string>} fetchArgs  Additional arguments to be added to fetchURL as query parameters
     * @param {object} childClass A prototype reference which JS Class should be used to create the element displaying a
     *                            fetched record
     * @param {boolean} wrap      Wrap defines whether this list is displayed as a single horizontal line of
     *                            infinitely loading results, or a vertical grid.
     * @param {string} className  The CSS class name for this list's main element.
     */
    constructor(parent, fetchUrl, fetchArgs, childClass, wrap, className) {
        this.el = Daniel.createElement({tag: "div", className: className})
        this.wrap = wrap;
        console.log(parent);
        this.DOMParent = parent;
        this.DOMParent.clearChildren();
        this.childClass = childClass;
        this.fetchNext = fetchUrl + Daniel.queryStringFromObject(fetchArgs);
        this.el.onscroll = () => this.loadMore();
        this.DOMParent.append(this.el);
        this.loadMore();
    }

    /**
     * If we have a fetchNext URL, and we are set to load either vertically or horizontally, load more records.
     */
    loadMore() {

        if (!this.doVerticalLoad() && !this.doHorizontalLoad()) {
            return;
        }

        fetch(this.fetchNext)
            .then((response) => response.json())
            .then(json => {
                this.fetchNext = json._metadata._links.next;
                this.appendChildren(json.data);
                if (json._metadata.total_count === 0) {
                    this.DOMParent.className = 'empty';
                }
            });

    }

    /**
     * add elements representing each record in `data` to our container.
     * @param data
     */
    appendChildren(data) {

        data.forEach(item => {

            const child = new this.childClass(item)
            this.el.append(child.el);
        });
    }

    /**
     * Are we wrapping and have we hit a vertical extent?
     * @returns {boolean}
     */
    doVerticalLoad() {
        console.log(this.wrap
            , this.el.scrollTop + this.el.clientHeight >= this.el.scrollHeight
            , this.fetchNext)
        return (this.wrap
            && this.el.scrollTop + this.el.clientHeight >= this.el.scrollHeight
            && this.fetchNext)
    }

    /**
     * Are we NOT wrapping and have we hit a horizontal extent?
     * @returns {boolean}
     */
    doHorizontalLoad() {
        console.log(!this.wrap
            , this.el.scrollLeft + this.el.clientWidth >= this.el.scrollWidth
            , this.fetchNext)
        return !this.wrap
            && this.el.scrollLeft + this.el.clientWidth >= this.el.scrollWidth
            && this.fetchNext
    }
}

/**
 * A container for a set of videos under a specific topic.
 * @type {Daniel.topic}
 */
Daniel
    .topic = class {
    title = null;
    el = null;
    group = null;
    data = {};
    list = null;
    next;

    /**
     *
     * @param {Daniel.dto.classification} topicRecord
     * @param {string | null} group
     */
    constructor(topicRecord, group) {
        this.el = Daniel.createElement({tag: "div", className: "daniel-topic-container"});
        this.group = group;
        this.title = Daniel.createElement({
            tag: "h2",
            className: "daniel-topic-title",
            textContent: topicRecord.description
        });
        const fetchArgs = {topics: topicRecord.ref, per_page: 10, page: 1, types: "video"}
        if (group) fetchArgs.groups = group;
        this.list = new Daniel.infiniteList(this.el, Daniel.fetchVideosUrl, fetchArgs, Daniel.videoSummary, false, "daniel-video-list");
        this.el.prepend(this.title);
    }
}
/**
 * Creates an Element containing a thumbnail, title and description for display in a list.
 * @type {Daniel.videoSummary}
 * @property {Element} el The DOM Element which will be displayed.
 * @property {Daniel.dto.asset} asset Contains required data
 */
Daniel
    .videoSummary = class {
    el = null;
    asset;

    /**
     *
     * @param {Daniel.dto.asset} asset
     */
    constructor(asset) {
        this.el = Daniel.createElement({tag: "div", className: "daniel-summary-item"});
        this.asset = asset;
        this.makeThumbImage();
        this.makeThumbMeta();
        this.el.onclick = this.openPlayer(asset);
    }

    openPlayer(asset) {
        return (e) => {
            e.preventDefault();
            const queryString = window.location.search;
            const urlParams = new URLSearchParams(queryString);
            urlParams.set('player', asset.ref)
            let newLocation = window.location.protocol + '//' + window.location.host + window.location.pathname + '?'
            const vals = []
            urlParams.forEach((val, key) => {
                vals.push(key + '=' + val)
            });
            window.location.href = newLocation + vals.join("&");
        }
    }

    makeThumbImage() {
        const thumbImage = Daniel.createElement({
            tag: "div",
            className: "thumbnail-image",
        });
        const imgSrc = !this.asset.excerpts.thumbnail ? "poster" : "thumbnail";
        thumbImage.style.backgroundImage = "url('" + this.asset.excerpts[imgSrc]._links.stream + "?v=small')";
        this.el.append(thumbImage);
    }

    makeThumbMeta() {
        const meta = Daniel.createElement({tag: "div", className: "daniel-summary-item-meta"});
        const title = Daniel.createElement({tag: "h4", textContent: this.asset.name});
        const description = Daniel.createElement({tag: "div", innerHTML: this.asset.description});
        meta.append(title, description);
        this.el.append(meta);
    }
}


Daniel
    .videoPlayer = class {

    asset = {}
    el;

    constructor(container, id, opts) {

        this.asset = this.retrieveAsset(id);
        let playerFrame = document.getElementsByClassName("daniel-player-window")[0];
        if (!playerFrame) {
            playerFrame = document.createElement("div");
            playerFrame.className = "daniel-player-window";
        }
        playerFrame.clearChildren();
        const player = document.createElement("div");
        player.className = "daniel-player";
        player.innerHTML = this.asset.embed;
        const meta = document.createElement("div");
        const title = document.createElement("h4");
        const description = document.createElement("div");
        title.textContent = this.asset.name;
        description.innerHTML = this.asset.description;
        meta.append(title, description);
        playerFrame.append(player, meta);
        this.el = playerFrame;
    }

    retrieveAsset(id) {
        return fetch(Daniel.fetchVideosUrl + "/" + id)
            .then((response) => response.json())
            .then(json => json);
    }
}


/**
 * Helper function to reduce LOC.
 * @param {Object.<string, string>} spec A map containing element attributes and associated values
 * @returns {Element} An HTML element which can be added to the DOM
 */
Daniel
    .createElement = (spec) => {
    if (typeof Element.prototype.clearChildren === 'undefined') {
        Object.defineProperty(Element.prototype, 'clearChildren', {
            configurable: true,
            enumerable: false,
            value: function () {
                while (this.firstChild) this.removeChild(this.lastChild);
            }
        });
    }
    const el = document.createElement(spec.tag);
    for (const [key, val] of Object.entries(spec)) {
        el[key] = val;
    }
    return el;
};


/**
 * Converts a simple object to a query string to append to a URL
 * @param {Object.<string, string>} object keys and values to turn into URL parameters
 * @returns {string} A render query-paramters string (e.g. '?foo=bar&baz=barf')
 */
Daniel
    .queryStringFromObject = (object) => {
    var qry = [];
    for (var key in object) {
        var item = object[key];
        if (Array.isArray(item)) {
            item.forEach(value => {
                qry.push(key + '[]=' + value);
            });
        } else {
            qry.push(key + '=' + item);
        }
    }
    if (qry.length === 0) {
        return '';
    }
    return '?' + qry.join('&');
}
