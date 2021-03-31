# MAL-Scraper


### MySQL setup

```
CREATE DATABASE anime;

USE anime;

CREATE TABLE characters (id MEDIUMINT NOT NULL, rawName TEXT, nativeName TEXT, parsedName TEXT, tinyImage TEXT, largeImage TEXT, likeRank MEDIUMINT, likes MEDIUMINT, source TEXT, sourceList TEXT, characterPage TEXT, sourcePage TEXT, html TEXT, primary key (id));

CREATE TABLE users (id TEXT NOT NULL, characters TEXT NOT NULL DEFAULT "[]", hasClaimed BOOLEAN NOT NULL DEFAULT true, primary key(id));
```

### Features