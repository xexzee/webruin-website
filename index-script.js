window.history.replaceState({title: initialTitle, item: initialItem}, '', initialPath);
window.onload = () => {
    renderItems('.item');
    document.querySelector('#load-more-button').style.opacity = 1;
    document.querySelector('#load-more-button').style.visibility = 'visible';
}
if(document.querySelector('#load-more-button')) {
    document.querySelector('#load-more-button').addEventListener('click', event => {
        document.querySelector('#load-more-button').style.visibility = 'hidden';
        document.querySelector('#load-more-button').style.opacity = 0;
        let httpRequest = new XMLHttpRequest();
        let url = '/page/' + (currentPage + 1);
        currentPage++;
        httpRequest.open('GET', url);
        httpRequest.responseType = 'document';
        httpRequest.send();
        httpRequest.onreadystatechange = () => {
            if(httpRequest.readyState === 4) {
                let response = httpRequest.response;
                response.querySelector('#items').innerHTML = response.querySelector('#items').innerHTML.replaceAll(/<noscript>.*?<\/noscript>/gs, '');
                response.querySelectorAll('#items img').forEach(image => image.parentElement.outerHTML = image.outerHTML);
                response.querySelectorAll('#items div').forEach(item => {
                    if(item.id !== 'items-background') {
                        let newItem = document.importNode(item, true);
                        newItem.classList.add('newItem');
                        document.querySelector('#items').append(newItem);
                    }
                });
                renderItems('.newItem');
                if(response.querySelector('#next-page-button')) {
                    document.querySelector('#load-more-button').style.visibility = 'visible';
                    document.querySelector('#load-more-button').style.opacity = 1;
                } else {
                    document.querySelector('#load-more-button').style.display = 'none';
                    document.querySelector('main').style.paddingBottom = '0px';
                }
            }
        }
    });
}
document.querySelector('#lightbox').addEventListener('click', event => {
    if(event.target.id === 'lightbox') {
        document.querySelector('#lightbox').style.display = 'none';
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
function loadItem(id) {
    id = id.substring(1);
    let httpRequest = new XMLHttpRequest();
    let url = '/item/details/' + id;
    httpRequest.open('GET', url);
    httpRequest.responseType = 'document';
    httpRequest.send();
    httpRequest.onreadystatechange = () => {
        if(httpRequest.readyState === 4) {
            let response = httpRequest.response;
            document.title = response.title;
            document.querySelector('#lightbox').innerHTML = response.querySelector('#item').outerHTML;
            document.querySelector('#lightbox').style.display = 'flex';
            let style = document.querySelector('#item-nav-toggle-rules');
            if(!style) {
                style = document.createElement('style');
                style.id = 'item-nav-toggle-rules';
                document.querySelector('head').appendChild(style);
            }
            style.innerHTML = response.querySelector('#item-nav-toggle-rules').innerHTML;
            window.history.pushState({'item': response.querySelector('#item').outerHTML, 'style': response.querySelector('#item-nav-toggle-rules').innerHTML, 'title': response.title}, 'item ' + id, '/item/' + id);
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