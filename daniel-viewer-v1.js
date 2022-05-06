// ADD PLAYER LISTENER
if (typeof Element.prototype.clearChildren === 'undefined') {
    Object.defineProperty(Element.prototype, 'clearChildren', {
        configurable: true,
        enumerable: false,
        value: function () {
            while (this.firstChild) this.removeChild(this.lastChild);
        }
    });
}

function initializeDaniel(opts) {

    const urls = {
        base: "https://dam.parenttv.com/"
    };
    urls.assets = urls.base + "assets/" + opts.license;
    urls.topics = urls.base + "topics/" + opts.license;
    document.addEventListener("DOMContentLoaded", async () => {
        const el = document.getElementById(opts.target);
        const container = document.createElement("div");
        container.className = "daniel-main-container";
        poweredBy(el);
        if (opts.collections) {
            doGroups(el, container, urls, opts.collections);
        } else if (opts.byTopic) {
            doTopics(el, container, urls);
        } else {
            doGrid(el, container, urls);
        }
    });
}

function doGroups(root, target, urls, collections) {
    const links = makeNavbar(target, urls);
    makeCollectionLinks(links, collections, target, urls);
    root.append(links, target);
    loadGroup("parent", target, urls).then(() => {
    });
}

function doTopics(root, target, urls) {
    const links = makeNavbar(target, urls);
    root.append(links, target);
    loadTopics(target, null, urls);
}

async function doGrid(root, target, urls) {
    const links = makeNavbar(target, urls);
    const data = await loadVideos(target, urls.assets, {types: "video"});
    const grid = document.createElement("div");
    grid.className = "daniel-video-grid";
    grid.append(...data.videos);
    target.append(grid);
    root.append(links, target);

    grid.next = data.meta._links.next;
    grid.onscroll = () => {
        if (grid.scrollTop + grid.clientHeight >= grid.scrollHeight && grid.next) {
            loadVideos(grid, grid.next).then((data) => {
                grid.next = data.meta._links.next;
                grid.append(...data.videos);
            }).catch((err) => console.log(err));

        }
    };

}

async function loadGroup(ref, target, urls) {
    target.clearChildren();
    await loadTopics(target, ref, urls);
}

function makeNavbar(target, urls) {
    const linkContainer = document.createElement("nav");
    linkContainer.className = "daniel-nav";
    const linkList = document.createElement("ul");
    linkContainer.append(linkList);
    makeSearchbar(target, linkList, urls);
    return linkContainer;
}

function makeCollectionLinks(linkContainer, collections, target, urls) {
    const linkList = document.createElement("ul");
    linkContainer.append(linkList);
    for (const [title, ref] of Object.entries(collections)) {
        const link = document.createElement("li");
        link.innerText = title;
        link.className = "daniel-group-link";
        link.onclick = (e) => {
            e.preventDefault();
            loadGroup(ref, target, urls);
        }
        linkList.append(link);
    }
}

function makeSearchbar(results, target, urls){
    const searchbar = document.createElement("li");
    searchbar.className = "daniel-group-link";
    const searchinput = document.createElement("input");
    searchinput.name = "query";
    searchinput.type = "text";
    const searchgo = document.createElement("input");
    searchgo.type = "submit";
    searchgo.value = "search";
    const searchform = document.createElement("form");
    searchform.onsubmit = (e) => {
        e.preventDefault();
        const tags = searchform.elements["query"].value.split(" ");
        loadSearch(results, urls.assets, tags);
    }
    searchform.append(searchinput, searchgo);
    searchbar.append(searchform);
    target.append(searchbar);
}

async function loadSearch(target, from, tags) {
    target.clearChildren();
    const el = document.createElement("div");
    el.className = "daniel-topic-container";
    const title = document.createElement("h2");
    title.className = "daniel-topic-title";
    title.textContent = tags.join(" ");
    const list = document.createElement("ul");
    list.className = "daniel-video-grid";
    const data = await loadVideos(list, from, {types: "video", tags: tags});

    el.append(title);
    el.append(list);
    target.prepend(el);
    if (data.meta.page_count === 0) {
        list.innerText = "There were no results for your search";
        return;
    }
    list.append(...data.videos);


}

async function loadTopics(target, group, urls) {
    const topics = await fetch(urls.topics + "?per_page=100")
        .then((response) => response.json())
        .then((json) => json.data)
    const list = document.createElement("div")
    list.className = "daniel-container"
    target.append(list);
    for (const topic of topics) {
        await makeTopic(list, urls.assets, topic, group);
    }
}


async function loadVideos(target, from, args) {
    if (args && !args.types) args.types = "video";
    const resp = await fetch(from + queryStringFromObject(args))
        .then((response) => response.json())
        .then(json => json);
    const videos = [];
    await resp.data.forEach(asset => {
        videos.push(makeVideoThumb(asset));
    })
    return {
        videos: videos,
        meta: resp._metadata,
    };
}

async function makeTopic(target, from, topic, group) {
    const el = Daniel.createElement({tag: "div", className: "daniel-topic-container"});
    const title = Daniel.createElement({tag: "h2", className: "daniel-topic-title", textContent: topic.description});
    const list = Daniel.createElement({tag: "ul", className: "daniel-video-list"});
    const args = {topics: topic.ref, page: 1}
    if (group) {
        args.groups = group;
    }
    const data = await loadVideos(list, from, args);
    if (data.meta.page_count === 0) {
        return null;
    }
    target.append(el);
    list.append(...data.videos);

    list.next = data.meta._links.next;
    list.onscroll = async () => {

        if (list.scrollLeft + list.clientWidth >= list.scrollWidth && list.next) {
            const data = await loadVideos(list, list.next);
            list.next = data.meta._links.next;
            list.append(...data.videos);
        }
    };
    console.log(title);
    el.append(title, list);
}

function makeVideoThumb(asset) {
    const thumbContainer = document.createElement("div");
    thumbContainer.className = "daniel-summary-item";
    thumbContainer.append(
        makeThumbImage(asset),
        makeThumbMeta(asset)
    );
    thumbContainer.onclick = () => {
        openVideoPlayer(asset);
    }
    return thumbContainer;
}

function makeThumbImage(asset) {
    const thumbImage = document.createElement("div");
    thumbImage.className = "thumbnail-image";
    let thumbsrc = '';
    if (!asset.excerpts.thumbnail) {
        thumbsrc = asset.excerpts.poster._links.stream;
    } else {
        thumbsrc = asset.excerpts.thumbnail._links.stream;
    }
    thumbImage.style.backgroundImage = "url('" + thumbsrc + "')";
    return thumbImage;
}

function makeThumbMeta(asset) {
    const meta = document.createElement("div");
    meta.className = "daniel-summary-item-meta";
    const title = document.createElement("h4");
    const description = document.createElement("div");
    title.textContent = asset.name;
    description.innerHTML = asset.description;
    meta.append(title, description);
    return meta;
}

function queryStringFromObject(object) {
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

function openVideoPlayer(container, assetRef) {
    let playerFrame = document.getElementsByClassName("daniel-player-window")[0];
    if (!playerFrame) {
        playerFrame = document.createElement("div");
        playerFrame.className = "daniel-player-window";
        container.prepend(playerFrame);
    }
    playerFrame.clearChildren();
    const player = document.createElement("div");
    player.className = "daniel-player";
    player.innerHTML = asset.embed;
    const meta = document.createElement("div");
    const title = document.createElement("h4");
    const description = document.createElement("div");
    title.textContent = asset.name;
    description.innerHTML = asset.description;
    meta.append(title, description);
    playerFrame.append(player, meta);
    document.getElementsByClassName("daniel-nav")[0].scrollIntoView();
}
 function poweredBy(target) {
     const pb = document.createElement("a");
     pb.href = "https://parenttv.com";
     pb.class = "pbwm";
     const pbImg = document.createElement("img")
     pbImg.src = "pbwm.png";
     pbImg.className = "pbwm";
     pb.append(pbImg);
     target.append(pb);
 }
