const express = require('express');
const app = express();
const dotenv = require('dotenv').config();
const { MongoClient, ObjectId } = require('mongodb');
const collection = new MongoClient(process.env.MONGODB_CONNECTIONSTRING)
        .db(process.env.MONGODB_DATABASE)
        .collection(process.env.MONGODB_COLLECTION);
const https = require('https');
const hbs = require('hbs');

app.use(express.urlencoded({
    extended: true
}));
app.set('view engine', 'hbs');
hbs.registerPartials('./views/partials');

async function nextPage(currentPage, query) {
    return new Promise(async resolve => {
        if(query) {
            if((process.env.NUMBER_OF_ITEMS_TO_LOAD * (parseInt(currentPage))) < await collection.countDocuments({$text: {$search: query}}))
                resolve(parseInt(currentPage) + 1);
            else
                resolve(null);
        } else {
            if((process.env.NUMBER_OF_ITEMS_TO_LOAD * (parseInt(currentPage))) < await collection.countDocuments({}, {hint: '_id_'}))
                resolve(parseInt(currentPage) + 1);
            else
                resolve(null);
        }
    })
}

function previousPage(currentPage) {
    if(parseInt(currentPage) > 1)
        return parseInt(currentPage) - 1;
    else
        return null;
}

async function fetchItems(page, query) {
    return new Promise(async resolve => {
        let items = null;
        if(query) {
            items = await collection.find({$text: {$search: query}}).sort({ score: { $meta: 'textScore'}, dateAdded: -1 }).limit(parseInt(process.env.NUMBER_OF_ITEMS_TO_LOAD)).skip(process.env.NUMBER_OF_ITEMS_TO_LOAD * page).toArray();
        }
        else {
            items = await collection.find().sort({ dateAdded: -1 }).limit(parseInt(process.env.NUMBER_OF_ITEMS_TO_LOAD)).skip(process.env.NUMBER_OF_ITEMS_TO_LOAD * page).toArray();
        } 
        return resolve(items.map(item => {
            let itemWidthLimit = parseInt(process.env.ITEM_WIDTH_LIMIT);
            if(item.type !== 'archived-image') {
                if(item.displayWidth > itemWidthLimit) {
                    item.displayHeight = Math.ceil(item.displayHeight * (itemWidthLimit / item.displayWidth));
                    item.displayWidth = itemWidthLimit;
                }
                item.maxWidth = itemWidthLimit;
            }
            item.displayHeight = Math.ceil(item.displayHeight / 8) + 2;
            item.displayWidth = Math.ceil(item.displayWidth / 8) + 2;
            item.filenames = item.filenames.sort((a, b) => {
                if(a < b)
                    return -1;
                if(a > b)
                    return 1;
                return 0;
            });
            return item;
        }));
    });
}

app.get('/', async (request, response) => {
    response.render('index', {items: await fetchItems(0), state: {title: 'w3bg0r3', path: '/'}, previousPage: previousPage(1), nextPage: await nextPage(1)});
});

app.get('/item/details/:id', async (request, response) => {
    let id = null;
    try {
        id = new ObjectId(encodeURIComponent(request.params.id));
    } catch(error) {
        response.status(400).send('MALFORMED ID PARAMETER');
    }
    let data = await collection.findOne({_id: new ObjectId(id)});
    let currentPage = Math.floor((await collection.countDocuments({dateAdded: {$gt: data.dateAdded}})) / parseInt(process.env.NUMBER_OF_ITEMS_TO_LOAD)) + 1;
    data.dateAdded = data.dateAdded.toLocaleDateString('en-US');
    if(!data)
        response.status(404).send('NO ITEM FOUND FOR GIVEN ID');
    else {
        response.setHeader('Content-Type', 'text/html');
        response.render('item-details', {itemDetails: data, currentPage: currentPage});
    }
});

app.get('/item/:id', async (request, response) => {
    let id = null;
    try {
        id = new ObjectId(encodeURIComponent(request.params.id));
    } catch(error) {
        response.status(400).send('MALFORMED ID PARAMETER');
    }
    let data = await collection.findOne({_id: new ObjectId(id)});
    data.dateAdded = data.dateAdded.toLocaleDateString('en-US');
    if(!data)
        response.status(404).send('NO ITEM FOUND FOR GIVEN ID');
    else {
        response.setHeader('Content-Type', 'text/html');
        response.render('index', {items: await fetchItems(), itemDetails: data, state: {title: data.name, path: '/item/' + data._id}, previousPage: previousPage(1), nextPage: await nextPage(1)});
    }
});

app.get('/page/:page', async (request, response) => {
    let page = encodeURIComponent(request.params.page);
    if(!/^\d+$/.test(page) || page < 1)
        response.status(400).send('MALFORMED PAGE NUMBER');
    let items = await fetchItems(page - 1);
    if(!items)
        response.status(404).send('PAGE NOT FOUND');
    response.render('index', {items: items, state: {title: 'page ' + page, path: '/page/' + page}, currentPage: parseInt(page), previousPage: previousPage(page), nextPage: await nextPage(page)});
});

app.get('/search/:query', async (request, response) => {
    let query = encodeURIComponent(request.params.query);
    let items = await fetchItems(0, query);
    response.render('index', {items: items, state: {title: 'search', path: '/search/' + query}, previousPage: previousPage(1), nextPage: await nextPage(1, query), query: decodeURIComponent(query)});
});

app.get('/search/:query/:page', async (request, response) => {
    let query = encodeURIComponent(request.params.query);
    let page = encodeURIComponent(request.params.page);
    if(!/^\d+$/.test(page) || page < 1)
        response.status(400).send('MALFORMED PAGE NUMBER');
    console.log(query);
    let items = await fetchItems(page - 1, query);
    if(!items)
        response.status(404).send('PAGE NOT FOUND');
    response.render('index', {items: items, state: {title: 'search', path: '/search/' + query + '/' + page + '/'}, currentPage: parseInt(page), previousPage: previousPage(page), nextPage: await nextPage(page, query), query: decodeURIComponent(query)});
});

app.post('/search', async (request, response) => {
    let query = encodeURIComponent(request.body['search-query']);
    let items = await fetchItems(0, query);
    response.render('index', {items: items, state: {title: 'search', path: '/search/' + query}, previousPage: previousPage(1), nextPage: await nextPage(1, query), query: decodeURIComponent(query)});
});

app.listen(8080);