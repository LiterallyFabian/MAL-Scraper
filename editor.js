var express = require('express');
var router = express.Router();
var cloudinary = require('cloudinary').v2;

router.post("/getdupes", (req, res) => {
    console.log("Getting duplicates...")
    connection.query(`SELECT parsedName, source, likeRank, largeImage, characterPage, id FROM characters ORDER BY likeRank asc LIMIT 20000;`, function (err, result) {
        if (err) {
            throw err;
        } else {
            var unique = [];
            var nonUnique = [];

            result.forEach(char => {
                if (!unique.includes(char.parsedName)) unique.push(char.parsedName);
                else(nonUnique.push(char));
            });
            console.log(`Found ${nonUnique.length} duplicates.`)
            res.send(nonUnique);
        }
    });
})

router.post("/update", (req, res) => {
    var name = req.body.name;
    var id = req.body.id;
    var source = req.body.source;
    var oldName = req.body.oldName;

    connection.query(`UPDATE characters SET parsedName =  ${connection.escape(name)}, isEdited = true WHERE id = ${id}`, function (err, result) {
        if (err) {
            throw err;
        } else {
            console.log(`Renamed ${oldName} from ${source} (ID: ${id}) to ${name}`)
            res.send(true);
        }
    });
})

router.post("/create", (req, res) => {
    var name = connection.escape(req.body.name);
    var id = connection.escape(req.body.id);
    var source = connection.escape(req.body.source);
    var pic = connection.escape(req.body.pic);
    var page = connection.escape(req.body.page);

    var query = `INSERT INTO characters(id, parsedName, rawName, nativeName, source, largeImage, characterPage, likes, isEdited) VALUES (${id}, ${name}, ${name}, ${name},  ${source}, ${pic}, ${page}, 0, 1) 
                ON DUPLICATE KEY UPDATE parsedName = ${name}, source = ${source}, largeImage = ${pic}, characterPage = ${page}, isEdited = 1`;

    connection.query(query, function (err, result) {
        if (err) {
            throw err;
        } else {
            console.log(`Added or updated character ${name}, ID ${id}`);
            if (pic.includes("cloudinary")) {
                console.log("Updating image " + pic)
                updateImage(id, `name=${name}|source=${source}|id=${id}|characterPage=${page}`)
            }
            res.send(true);
        }
    });
})

router.post("/fetch", (req, res) => {
    var id = req.body.id;

    connection.query(`SELECT * FROM characters WHERE id = ${id}`, function (err, result) {
        if (err) {
            throw err;
        } else {
            if (result.length > 0) res.send(result);
            else res.send(false)
        }
    });
})

//uploads pic to Cloudinary 
router.post("/upload", (req, res) => {
    var name = req.body.name;
    var id = req.body.id;
    var source = req.body.source;
    var pic = req.body.pic;
    var page = req.body.page;

    uploadImage(pic, id, `name=${name}|source=${source}|id=${id}|characterPage=${page}`, res);
})

router.post("/delete", (req, res) => {
    var id = req.body.id;
    var oldName = req.body.oldName;
    var source = req.body.source;

    connection.query(`DELETE FROM characters WHERE id = ${id}`, function (err, result) {
        if (err) {
            throw err;
        } else {
            console.log(`Deleted ${oldName} from ${source} (ID: ${id})`)
            res.send(true);
        }
    });
})

router.post("/batchrename",(req, res) => {
    var pattern = req.body.pattern;
    var newName = req.body.name;
    var query = `UPDATE characters SET source = "${newName}", isEdited = 1 WHERE source LIKE "${pattern}"`;
    connection.query(query, function (err, result) {
        if (err) {
            throw err;
        } else {
            console.log(query);
            console.log(result);
            console.log(`Renamed shows with pattern '${pattern}' to ${newName}'.`);
            res.send(true);
        }
    });

})

async function uploadImage(pic, id, context, res = false) {
    cloudinary.uploader.upload(
        pic, {
            public_id: `characters/${id}`,
            context: context
        },
        function (error, result) {
            if (error) {
                throw error;
            } else {
                connection.query(`UPDATE characters SET largeImage = '${result.secure_url}' WHERE id = ${id}`, function (err, sqlresult) {
                    if (err) {
                        throw err;
                    } else {
                        console.log(`Updated image link for ID ${id}.`)
                        if (res) res.send(result.secure_url);
                    }
                });
            }
        }
    );
}

var updateImage = function updateImage(id, context) {
    cloudinary.api.update(`characters/${id}`, {
        context: context
    }, function (error, result) {
        if (error) throw error;
    })
}

module.exports = router;