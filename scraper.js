var express = require('express');
var router = express.Router();
var scrape = require('website-scraper');
var fs = require('fs')
var cloudinary = require('cloudinary').v2;
const timer = ms => new Promise(res => setTimeout(res, ms))

router.post('/download', (req, res) => {
    var startAt = parseInt(req.body.inputStart);
    var stopAt = parseInt(req.body.inputEnd);
    var update = req.body.updateData;

    console.log(`Processing entry ${startAt} to ${stopAt}. Updating mode: ${update}`)


    if (update != "cdn") load(startAt, stopAt, update);
    else uploadCdn(startAt, stopAt);
});

async function load(startAt, stopAt, update) {
    for (var i = startAt; i < stopAt; i += 50) {
        var dirPath = `./data/${i}/index.html`;
        var downloading = false;

        //check if file exists & download/parse if needed
        if (fs.existsSync(dirPath)) {
            if (update == "all") { //redownload file if everything should be updated
                fs.rmdir(dirPath, {
                    recursive: true
                }, (err) => {
                    if (err) {
                        throw err;
                    }
                    downloadFile(i);
                    downloading = true;
                });
            } else if (update == "fetched") { //parse file if it should be updated
                processFile(dirPath);
            }
        } else if (update == "missing") {
            downloadFile(i);
            downloading = true;
        }
        //add 5-15s delay to the next query
        await timer(downloading ? 5000 + Math.floor(Math.random() * Math.floor(15000)) : 0);
    }
    console.log(`Done! Added ${stopAt-startAt} characters.`)
}

async function uploadCdn(startAt, stopAt) {
    connection.query(`SELECT largeImage,parsedName,id,likeRank,source,characterPage FROM characters WHERE likeRank >= ${startAt} AND likeRank <= ${stopAt}`, function (err, result) {
        if (err) throw err;
        else {
            result.forEach(char => {
                //upload pic to cloudinary
                if (char.largeImage.includes("res.cloudinary.com")) {
                    console.log(char);
                    updateImage(char.id, `name=${char.parsedName}|source=${char.source}|id=${char.id}|characterPage=${char.characterPage}`)
                    return;
                }
                cloudinary.uploader.upload(
                    char.largeImage, {
                        public_id: `characters/${char.id}`,
                        context: `name=${char.parsedName}|source=${char.source}|id=${char.id}`,
                        overwrite: true
                    },
                    function (error, result) {
                        if (error) {
                            console.error(`Error uploading character ${char.parsedName} with ID ${char.id}.`)
                            console.error(char);
                            throw error;
                        } else {
                            connection.query(`UPDATE characters SET largeImage = '${result.secure_url}' WHERE id = ${char.id}`, function (err, sqlresult) {
                                if (err) {
                                    throw err;
                                } else {
                                    console.log(`Updated image link for ${char.parsedName}, ID ${char.id}.   ${result.secure_url}`)
                                }
                            });
                        }
                    }
                );
            })
            console.log(`Done! Uploaded ${stopAt-startAt} characters.`)
        }
    });
}

function downloadFile(index) {
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
    console.log(`Downloading page ${index}-${index+50}...`)
    scrape(options).then((result) => {
        processFile(`./data/${index}/index.html`);
    });
}

function processFile(path) {
    fs.readFile(path, 'utf8', (err, data) => {
        if (err) {
            console.error(err)
            return
        }
        //remove new lines
        data = data.replace(/(\r\n|\n|\r)/gm, "");

        let reg = /<tr class="ranking-list">(.+?(?=<\/tr>))/gm
        let matches = (data.match(reg) || []).map(e => e.replace(reg, '$1'));

        matches.forEach(entry => {
            processEntry(entry);
        })
    })
}

//Processes a html block for a character (<tr class="ranking-list">...</tr>)
function processEntry(html) {

    var obj = {};

    obj["id"] = parseInt(getGroup(html, /href="https:\/\/myanimelist\.net\/character\/(\d+)\//));
    obj["rawName"] = getGroup(html, /alt="(.+?(?="))"/);
    obj["parsedName"] = (obj["rawName"].includes(", ")) ? `${obj["rawName"].split(", ")[1]} ${obj["rawName"].split(", ")[0]}` : obj["rawName"];
    obj["nativeName"] = getGroup(html, /fs12 fn-grey\d">\((.+)\)<\/span>/);
    obj["characterPage"] = getGroup(html, /href="(.+)" id="#area" rel="#info">/);
    obj["tinyImage"] = getGroup(html, /data-src="(.+?(?="))"/);
    obj["largeImage"] = `https://cdn.myanimelist.net/images/characters/${getGroup(obj.tinyImage, /characters\/(\d+\/\d+).(png|jpg|webp|jpeg)/)}.jpg`;
    obj["likes"] = parseInt(getGroup(html, /class="favorites">(.+?(?=<\/td>))<\/td>/).replace(",", ""));
    obj["likeRank"] = parseInt(getGroup(html, /pepole-rank-text rank\d">(\d+)<\/span>/g));


    //get source
    obj["sourceList"] = [];
    let sourcereg = /<div class="title"><a href=".+?(?=">)">(.+?(?=<\/a>))<\/a>/g;
    var rawSources = html.match(sourcereg);

    if (rawSources == null || obj["largeImage"] == "https://cdn.myanimelist.net/images/characters/undefined.jpg") return;

    rawSources.forEach(entry => {
        obj["sourceList"].push(JSON.stringify((entry.match(sourcereg) || []).map(e => e.replace(sourcereg, '$1'))));
    });



    //obj["source"] = getGroup(html, /animeography"><div class="title"><a href=".+?(?=">)">(.+?(?=<\/a>))<\/a>/);
    obj["sourcePage"] = getGroup(html, /animeography"><div class="title"><a href="(.+?(?=">))">/);

    //set first manga as main source if character does not have an anime
    if (obj.source == undefined) {
       // obj["source"] = getGroup(html, /mangaography"><div class="title"><a href=".+?(?=">)">(.+?(?=<\/a>))<\/a>/);
        obj["sourcePage"] = getGroup(html, /mangaography"><div class="title"><a href="(.+?(?=">))">/);
    }

    var animeSourceReg = /myanimelist\.net\/anime\/(\d+)/g;
    var mangaSourceReg = /myanimelist\.net\/manga\/(\d+)/g;

    obj["animeSources"] = JSON.stringify((html.match(animeSourceReg) || []).map(e => e.replace(animeSourceReg, '$1')));
    obj["mangaSources"] = JSON.stringify((html.match(mangaSourceReg) || []).map(e => e.replace(mangaSourceReg, '$1')));

    connection.query(`INSERT INTO characters 
    (id, parsedName, nativeName, rawName, characterPage, tinyImage, largeImage, source, sourceList, sourcePage, likes, likeRank, mangaSources, animeSources) 
    VALUES(${obj.id},"${obj.parsedName}","${obj.nativeName}","${obj.rawName}","${obj.characterPage}","${obj.tinyImage}","${obj.largeImage}","${obj.source}",'${JSON.stringify(obj.sourceList)}',"${obj.sourcePage}",${obj.likes},${obj.likeRank},'${obj.mangaSources}','${obj.animeSources}') 
    ON DUPLICATE KEY UPDATE tinyImage = "${obj.tinyImage}", largeImage = "${obj.largeImage}", sourcePage = "${obj.sourcePage}", sourceList = '${JSON.stringify(obj.sourceList)}', likes = ${obj.likes}, likeRank = ${obj.likeRank}, mangaSources = '${obj.mangaSources}', animeSources = '${obj.animeSources}';`, function (err, result) {
        if (err) {
            console.log("\n=====================================\n")
            console.log(obj);
            console.log("\n" + html)
            throw err;
        } else {
            console.log(`Added or updated ${obj["parsedName"]}.`);
            //console.log(obj);
        }
    });

}

function getGroup(string, regex) {
    var matches = (string.match(regex) || []).map(e => e.replace(regex, '$1'));
    if (matches)
        return matches[0];
    else return null;

}

router.post('/getdata', (req, res) => {
    var search = req.body.search;
    console.log("Searching for " + search)

    //char.parsedName, char.source, char.largeImage, char.characterPage
    var query = `
    SELECT parsedName,source,largeImage,characterPage,likeRank,id FROM characters 
    WHERE (parsedName LIKE ${connection.escape(search+"%")} OR source LIKE ${connection.escape(search+"%")} OR rawName LIKE ${connection.escape(search+"%")} OR sourceList LIKE ${connection.escape(`%["${search}%`)})
    ORDER BY likes DESC LIMIT 100`;

    connection.query(query, function (err, result) {
        if (err) throw err;
        else {
            res.send(result);
        }
    });
});

router.get('/getall', (req, res) => {
    connection.query(`SELECT * FROM characters`, function (err, result) {
        if (err) throw err;
        else {
            res.send(result);
        }
    });
})


var updateImage = function updateImage(id, context) {
    cloudinary.api.update(`characters/${id}`, {
        context: context
    }, function (error, result) {
        if (error) throw error;
    })
}

module.exports = router;