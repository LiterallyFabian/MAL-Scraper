var express = require('express');
var router = express.Router();

router.post("/getdupes", (req, res) => {
    console.log("Getting duplicates...")
    connection.query(`SELECT parsedName, source, likeRank, largeImage, characterPage, id FROM characters ORDER BY likeRank asc LIMIT 20000;`, function (err, result) {
        if (err) {
            throw err;
        } else {
            var unique = [];
            var nonUnique = [];

            result.forEach(char =>{
                if(!unique.includes(char.parsedName)) unique.push(char.parsedName);
                else(nonUnique.push(char));
            });
            console.log(`Found ${nonUnique.length} duplicates.`)
            res.send(nonUnique);
        }
    });
})

router.post("/update", (req,res)=>{
    var name = req.body.name;
    var id = req.body.id;
    var source = req.body.source;
    var oldName = req.body.oldName;

    connection.query(`UPDATE characters SET parsedName = '${name}', isEdited = true WHERE id = ${id}`, function (err, result) {
        if (err) {
            throw err;
        } else {
            console.log(`Renamed ${oldName} from ${source} (ID: ${id}) to ${name}`)
            res.send(true);
        }
    });
})

router.post("/delete", (req,res)=>{
    var id = req.body.id;
    var oldName = req.body.oldName;
    var id = req.body.id;
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
module.exports = router;