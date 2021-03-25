//Creates cards for characters on load

class character {
    constructor(name, source, image, link, rank) {
        this.name = name, this.source = source, this.image = image, this.link = link, this.rank = rank
    }

    get card() {
        return this.generateCard();
    }

    generateCard() {
        return `
        <div class="col mb-4 gallery-entry">
    <div class="card h-100" style="flex:0;min-width:10rem; max-width:15rem;">
    <b style="margin: auto">#${this.rank}</b>
        <a href="${this.link}"><img class="card-img-top" src="${this.image}" alt="${this.name}"></a>
            <div class="card-body">
                <h5 class="card-title">${this.name}</h5>
                <p class="card-text">${this.source}</p>
            </div></div>
        </div>`;
    }
}

//gets a list of all articles in database on page load
var characters = [];


$(document).ready(function () {
    downloadData();
});

function downloadData() {
    $.post("/scraper/getdata", {
        search: document.getElementById("search") == null ? "" : document.getElementById("search").value
    }, function (data) {
        characters = [];
        $.each(data, function (i, char) {
            characters.push(new character(char.parsedName, char.source, char.largeImage, char.characterPage, char.likeRank));
        })
        UpdateFeed();
    });
}


function UpdateFeed() {
    document.querySelectorAll('.gallery-entry').forEach(e => e.remove());


    $.each(characters, function (i, character) {
        $("#gallery").append($(character.card));
    })
}