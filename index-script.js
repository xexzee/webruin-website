window.history.replaceState({title: initialTitle, item: initialItem}, '', initialPath);
window.onload = () => {
    document.querySelector('header').style.opacity = 1;
    let pageBackground = document.querySelector('#page-background');
    pageBackground.style.backgroundPosition = '0 ' + (pageBackground.getBoundingClientRect().y + document.querySelector('#page-content').scrollTop / 4) * -1 + 'px';
    pageBackground.style.opacity = '1';
    let itemsBackground = document.querySelector('#items-background');
    itemsBackground.style.backgroundPosition = '0 ' + (itemsBackground.getBoundingClientRect().y + document.querySelector('#page-content').scrollTop / 2) * -1 + 'px';
    itemsBackground.style.opacity = '0.5';
    renderItems('.item');
    document.querySelector('#load-more-button').style.opacity = 1;
    document.querySelector('#load-more-button').style.visibility = 'visible';
}
if(document.querySelector('#load-more-button')) {
    document.querySelector('#load-more-button').addEventListener('click', event => {
        document.querySelector('#load-more-button').style.opacity = 0;
        let loadingImage = createLoadingImage();
        loadingImage.style.left = '50%';
        loadingImage.style.transform = 'translate(calc(-50% + 2px), -' + document.scrollHeight * 1.5 + 'px)';
        document.querySelector('main').appendChild(loadingImage);
        let httpRequest = new XMLHttpRequest();
        currentPage++;
        let url = null;
        if(initialQuery)
            url = '/search/' + initialQuery + '/' + currentPage;
        else
            url = '/page/' + currentPage;
        httpRequest.open('GET', url);
        httpRequest.responseType = 'document';
        httpRequest.send();
        httpRequest.onreadystatechange = () => {
            if(httpRequest.readyState === 4) {
                let response = httpRequest.response;
                response.querySelector('#items').innerHTML = response.querySelector('#items').innerHTML.replaceAll(/<noscript>.*?<\/noscript>/gs, '');
                response.querySelectorAll('#items img').forEach(image => image.parentElement.outerHTML = image.outerHTML);
                document.querySelector('main').removeChild(loadingImage);
                response.querySelectorAll('#items div').forEach(item => {
                    if(item.id !== 'items-background') {
                        let newItem = document.importNode(item, true);
                        newItem.classList.add('newItem');
                        document.querySelector('#items').append(newItem);
                    }
                });
                if(response.querySelector('#next-page-button')) {
                    document.querySelector('#load-more-button').style.opacity = 1;
                } else {
                    document.querySelector('#load-more-button').style.display = 'none';
                    document.querySelector('main').style.paddingBottom = '0px';
                }
                let pageBackground = document.querySelector('#page-background');
                pageBackground.style.backgroundPosition = '0 ' + (pageBackground.getBoundingClientRect().y + document.querySelector('#page-content').scrollTop / 4) * -1 + 'px';
                let itemsBackground = document.querySelector('#items-background');
                itemsBackground.style.backgroundPosition = '0 ' + (itemsBackground.getBoundingClientRect().y + document.querySelector('#page-content').scrollTop / 2) * -1 + 'px';
                renderItems('.newItem');
            }
        }
    });
}
document.querySelector('body').addEventListener('click', event => {
    let aboutButton = document.querySelector('#about-button');
    let aboutElementIDs = ['about', 'about-button', 'about-button-label', 'about-text'];
    if(!aboutElementIDs.includes(event.target.id) && aboutButton.checked === true)
        aboutButton.checked = false;
});
document.querySelector('#lightbox').addEventListener('click', event => {
    if(event.target.id === 'lightbox') {
        document.querySelector('#lightbox').style.display = 'none';
        document.querySelector('#lightbox').innerHTML = '';
        window.history.pushState({'title': initialTitle}, initialTitle, initialPath);
        document.title = initialTitle;
    }
});
window.addEventListener('popstate', event => {
    if(event.state) {
        document.title = event.state.title;
        if(event.state.item) {
            document.querySelector('#lightbox').style.display = 'flex';
            document.querySelector('#lightbox').innerHTML = event.state.item;
        } else {
            document.querySelector('#lightbox').style.display = 'none';
        }
        if(event.state.style) {
            let style = document.querySelector('#item-nav-toggle-rules');
            if(!style) {
                style = document.createElement('style');
                style.id = 'item-nav-toggle-rules';
                document.querySelector('head').appendChild(style);
            }
            style.innerHTML = event.state.style;
        }
        else {
            let style = document.querySelector('#item-nav-toggle-rules');
            if(style)
                style.parentElement.removeChild(style);
        }
    }
});
async function loadItem(id) {
    let urlId = id.substring(1);
    let initialLoadingImage = createLoadingImage();
    document.querySelector('#' + id).parentElement.appendChild(initialLoadingImage);
    document.querySelector('#' + id).style.opacity = 0.5;
    let httpRequest = new XMLHttpRequest();
    let url = '/item/details/' + urlId;
    httpRequest.open('GET', url);
    httpRequest.responseType = 'document';
    httpRequest.send();
    httpRequest.onreadystatechange = () => {
        if(httpRequest.readyState === 4) {
            let response = httpRequest.response;
            document.title = response.title;
            window.history.pushState({'item': response.querySelector('#item').outerHTML, 'style': response.querySelector('#item-nav-toggle-rules').innerHTML, 'title': response.title}, 'item ' + urlId, '/item/' + urlId);
            response.querySelectorAll('.image').forEach(image => image.style.opacity = 0);
            document.querySelector('#lightbox').appendChild(response.querySelector('#item'));
            Array.from(document.querySelectorAll('#lightbox .image')).forEach(image => {
                if(image.complete) {
                    image.style.opacity = 1;
                }
                else {
                    let loadingImage = createLoadingImage();
                    image.style.transition = 'opacity 0.25s';
                    image.parentElement.appendChild(loadingImage);
                    image.onload = () => {
                        image.style.opacity = 1;
                        image.parentElement.removeChild(loadingImage);
                    }
                }
            });
            document.querySelector('#lightbox').style.width = 'calc(100% - ' + document.querySelector('#page-content').offsetWidth - document.querySelector('#page-content').clientWidth + 'px)';
            document.querySelector('#lightbox').style.display = 'flex';
            document.querySelector('#' + id).style.opacity = 1;
            document.querySelector('#' + id).parentElement.removeChild(initialLoadingImage);
            let style = document.querySelector('#item-nav-toggle-rules');
            if(!style) {
                style = document.createElement('style');
                style.id = 'item-nav-toggle-rules';
                document.querySelector('head').appendChild(style);
            }
            style.innerHTML = response.querySelector('#item-nav-toggle-rules').innerHTML;
        }
    }
}
async function renderItems(query) {
    let items = document.querySelectorAll(query);
    for(item of items) {
        await new Promise(resolve => setTimeout(resolve, 25));
        item.querySelector('img').onclick = event => loadItem(event.target.id);
        item.style.opacity = 1;
        item.classList.remove('newItem');
    }
}
function createLoadingImage() {
    let loadingImage = document.createElement('img');
    loadingImage.src = 'https://content.webru.in/648fb035ca3bfbf16422be1c/cd2.gif';
    loadingImage.className ='loading-image';
    return loadingImage;
}