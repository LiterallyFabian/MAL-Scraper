var express = require('express');
var router = express.Router();
var fetch = require('node-fetch');
var HTMLParser = require('node-html-parser');
var scrape = require('website-scraper');
var fs = require('fs')

router.post('/download', (req, res) => {
    var startAt = parseInt(req.body.inputStart);
    var stopAt = parseInt(req.body.inputEnd);
    var update = req.body.updateFetched == "on";

    console.log(`Processing entry ${startAt} to ${stopAt}. Updating fetched: ${update}`)

    const timer = ms => new Promise(res => setTimeout(res, ms))

    async function load() {
        for (var i = startAt; i < stopAt; i += 50) {

            //check if file exists & download if needed
            if (fs.existsSync(`./data/${i}/index.html`)) {
                if (update) downloadFile(i);
            } else {
                downloadFile(i);
            }

            //add 5-15s delay to the next query
            await timer(5000 + Math.floor(Math.random() * Math.floor(15000)));
        }
        console.log(`Done! Added ${stopAt-startAt} characters.`)
    }
    load();
});

function downloadFile(index) {
    let reg = /<tr class="ranking-list">(.+?(?=<\/tr>))/gm

    //scraping options
    const options = {
        urls: [`https://myanimelist.net/character.php?limit=${index}`],
        directory: `${__dirname}/data/${index}`,
        sources: [],
        request: {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/80.0.3987.149 Safari/537.36'
            }
        }
    };

    //scrape page
    console.log(`Getting page ${index}-${index+50}...`)
    scrape(options).then((result) => {
        fs.readFile(`./data/${index}/index.html`, 'utf8', (err, data) => {
            if (err) {
                console.error(err)
                return
            }
            data = data.replace(/(\r\n|\n|\r)/gm, "");
            let matches = (data.match(reg) || []).map(e => e.replace(reg, '$1'));

            matches.forEach(entry => {
                processEntry(entry);
            })
        })
    });


    /*
     */


}

//Processes a html block for a character (<tr class="ranking-list">...</tr>)
function processEntry(html) {

    var obj = {};

    obj["id"] = parseInt(getGroup(html, /href="https:\/\/myanimelist\.net\/character\/(\d+)\//));
    var rawName = getGroup(html, /alt="(.+?(?="))"/);
    obj["parsedName"] = (rawName.includes(", ")) ? `${rawName.split(", ")[1]} ${rawName.split(", ")[0]}` : rawName;
    obj["nativeName"] = getGroup(html, /\((.+)\)<\/span>/);
    obj["rawName"] = rawName;
    obj["characterPage"] = getGroup(html, /href="(.+)" id="#area" rel="#info">/);
    obj["tinyImage"] = getGroup(html, /data-src="(.+?(?="))"/);
    obj["largeImage"] = `https://cdn.myanimelist.net/images/characters/${getGroup(obj.tinyImage, /characters\/(\d+\/\d+).(png|jpg|webp|jpeg)/)}.jpg`;
    obj["source"] = getGroup(html, /animeography"><div class="title"><a href=".+?(?=">)">(.+?(?=<\/a>))<\/a>/);
    obj["sourcePage"] = getGroup(html, /animeography"><div class="title"><a href="(.+?(?=">))">/);
    obj["likes"] = parseInt(getGroup(html, /class="favorites">(.+?(?=<\/td>))<\/td>/).replace(",", ""));
    obj["likeRank"] = parseInt(getGroup(html, /pepole-rank-text rank\d">(\d+)<\/span>/g));

    //set manga if character does not have an anime
    if (obj.source == undefined) {
        console.log("undefined for " + obj.parsedName)
        obj["source"] = getGroup(html, /mangaography"><div class="title"><a href=".+?(?=">)">(.+?(?=<\/a>))<\/a>/);
        obj["sourcePage"] = getGroup(html, /mangaography"><div class="title"><a href="(.+?(?=">))">/);
    }

    connection.query(`INSERT INTO characters 
    (id, parsedName, nativeName, rawName, characterPage, tinyImage, source, sourcePage, likes, likeRank) 
    VALUES(${obj.id},"${obj.parsedName}","${obj.nativeName}","${obj.rawName}","${obj.characterPage}","${obj.tinyImage}","${obj.source}","${obj.sourcePage}",${obj.likes},${obj.likeRank}) 
    ON DUPLICATE KEY UPDATE tinyImage = "${obj.tinyImage}", largeImage = "${obj.largeImage}", source = "${obj.source}", sourcePage = "${obj.sourcePage}", likes = ${obj.likes}, likeRank = ${obj.likeRank};`, function (err, result) {
        if (err) throw err;
        else {
            console.log(`Added or updated ${obj["parsedName"]}.`);
        }
    });

}

function getGroup(string, regex) {
    var matches = (string.match(regex) || []).map(e => e.replace(regex, '$1'));
    if (matches)
        return matches[0];
    else return null;

}

module.exports = router;