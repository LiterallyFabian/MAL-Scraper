# MAL-Scraper
A scraper for MyAnimeList, created for one of my [other projects](https://github.com/LiterallyFabian/SaltBot-Gacha). 

### Features
- Web interface (Express)
- Cloud backup (Cloudinary)
- Tools for renaming/removing duplicates

### Screenshots
Main interface

![image](https://user-images.githubusercontent.com/47401343/162632401-c8c76a75-732f-4d88-9da6-a4f78eee89e8.png)

Character view

![image](https://user-images.githubusercontent.com/47401343/162632675-311b9938-f237-4ef1-ace9-52e5d1cf0f2a.png)

Character editor

![image](https://user-images.githubusercontent.com/47401343/162632561-66fca4ee-25d6-4bcc-9cdb-a26ff3459543.png)


### MySQL setup

```
CREATE DATABASE anime;

USE anime;

CREATE TABLE characters (id MEDIUMINT NOT NULL, rawName TEXT, nativeName TEXT, parsedName TEXT, tinyImage TEXT, largeImage TEXT, likeRank MEDIUMINT, likes MEDIUMINT, source TEXT, sourceList TEXT, characterPage TEXT, sourcePage TEXT, html TEXT, primary key (id));
```
