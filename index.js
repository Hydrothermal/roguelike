var keypress = require("keypress"),
    colors = require("colors"),
    game = {
        //Map settings
        //77x21 with borders will fit a default Windows command prompt
        width: 100,
        height: 23,
        bordered: true,
        //When true, the player will appear on the opposite side of the map when moving off the edge
        wrap: true,
        //Color detail (0 = none; 1 = very little; 2 = full)
        color: 1,
        map: []
    },
    player = {
        //Character to use for the player (\u263A is a smiley)
        ch: "\u263A",
        xp: 0,
        gold: 0,
        stats: {
            str: randRange(4, 9),
            con: randRange(4, 9),
            dex: randRange(4, 9),
            int: randRange(4, 9),
            wis: randRange(4, 9),
            cha: randRange(4, 9)
        }
    };

String.prototype.c = function(n, color) {
    if(game.color >= n) {
        return this[color];
    }

    return this.toString();
};

function randRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function readInput() {
    keypress(process.stdin);

    process.stdin.on("keypress", function(ch, key) {
        //Normally this function intercepts all input but we want to let ctrl+c go through
        if(key && key.ctrl && key.name === "c") {
            process.exit();
        }
    });

    process.stdin.setRawMode(true);
    process.stdin.resume();
}

function parseInput() {
    readInput();

    process.stdin.on("keypress", function(ch, key) {
        if(key.name === "up") {
            movePlayer(0, -1);
        } else if(key.name === "down") {
            movePlayer(0, 1);
        } else if(key.name === "left") {
            movePlayer(-1, 0);
        } else if(key.name === "right") {
            movePlayer(1, 0);
        }
    });
}

function cls() {
    process.stdout.write("\033c");
}

function writeMap() {
    cls();
    console.log(drawMap());
    console.log(statusLine());
}

function colorStat(num) {
    num = num.toString()

    if(num <= 3) {
        return num.c(2, "red");
    }

    if(num <= 15) {
        return num.c(2, "yellow");
    }

    if(num <= 30) {
        return num.c(2, "green");
    }

    if(num <= 60) {
        return num.c(2, "cyan");
    }

    if(num <= 99) {
        return num.c(2, "bold").c(2, "cyan");
    }

    return num.c(2, "bold").c(2, "magenta");
}

function statusLine() {
    var status = [];

    status.push("HP: " + Math.floor(player.hp) + "/" + player.maxhp);
    status.push("Level: " + level(true));
    status.push("  ");
    status.push("STR: " + colorStat(player.stats.str));
    status.push("CON: " + colorStat(player.stats.con));
    status.push("DEX: " + colorStat(player.stats.dex));
    status.push("INT: " + colorStat(player.stats.int));
    status.push("WIS: " + colorStat(player.stats.wis));
    status.push("CHA: " + colorStat(player.stats.cha));
    status.push("  ");
    status.push("Gold: " + player.gold);

    return status.join(" ");
}

function drawMap() {
    var lines = [],
        //Horizontal rule (a full-width line of dashes)
        hr = new Array(game.width + 1).join("-"),
        //corners = ["/", "\\"],
        corners = ["#", "#"],
        cell;

    //Draw rows
    for(var y = 0; y < game.map.length; y++) {
        lines[y] = [];
        
        //Left border
        if(game.bordered) {
            lines[y].push("|");
        }

        for(var x = 0; x < game.map[y].length; x++) {
            cell = game.map[y][x];

            if(cell.player) {
                lines[y].push(player.ch);
            } else if(cell.gold) {
                lines[y].push("+".c(1, "yellow"));
            } else {
                switch(cell.terrain) {
                    case 0:
                    lines[y].push(" ")
                    break;

                    case 1:
                    lines[y].push("#".c(2, "green"))
                    break;

                    case 2:
                    lines[y].push("~".c(2, "blue"))
                    break;
                }
            }
        }

        //Join the row array into a string
        lines[y] = lines[y].join("");

        //Right border
        if(game.bordered) {
            lines[y] += "|";
        }
    }

    //Top and bottom borders
    if(game.bordered) {
        lines.unshift(corners[0] + hr + corners[1]);
        lines.push(corners[1] + hr + corners[0]);
    }

    return lines.join("\n");
}

//Currently there's no reason not to call this with floor = false but it's there just in case
function level(floor) {
    var level = 1 + (player.xp / 1000);

    if(floor) {
        level = Math.floor(level);
    }

    return level;
}

function getCell(x, y) {
    var row = game.map[y],
        cell;

    if(!row) { return false; }
    
    cell = row[x];

    if(!cell) { return false; }

    return cell;
}

function writeCell(x, y, props) {
    var cell = getCell(x, y);

    if(cell) {
        for(prop in props) {
            cell[prop] = props[prop];
        }

        return cell;
    }

    return false;
}

function generateTerrainPatch(x, y, terrain) {
    var height = randRange(8, 16),
        width = 1,
        walker = [x, y];

    game.map[y][x].terrain = terrain;

    for(var i = 0; i < height; i++) {
        walker[1]++;

        //When we're still generating above the vertical halfway point
        if(walker[1] - y < height / 2) {
            //Move the generator to the left a bit and stretch it to the right
            walker[0] -= randRange(1, 3);
            width += randRange(1, 6);
        } else {
            //After the halfway point, the width of each line starts shrinking
            //This creates lopsided diamond shapes
            walker[0] += randRange(1, 3);
            width -= randRange(1, 6);
        }

        //Fill in this line with terrain
        for(var u = 0; u < width; u++) {
            writeCell(walker[0] + u, walker[1], { terrain: terrain });
        }
    }
}

function generateTerrain() {
    var trees = randRange(6, 10),
        water = randRange(3, 6);

    for(var i = 0; i < trees; i++) {
        generateTerrainPatch(randRange(0, game.width - 1), randRange(0, game.height - 1), 1);
    }

    for(var i = 0; i < water; i++) {
        generateTerrainPatch(randRange(0, game.width - 1), randRange(0, game.height - 1), 2);
    }
}

function generateGold() {
    var gold = randRange(4, 18);

    for(var i = 0; i < gold; i++) {
        writeCell(randRange(0, game.width - 1), randRange(0, game.height - 1), { gold: randRange(6, 50) });
    }
}

function generateMap() {
    for(var y = 0; y < game.height; y++) {
        game.map[y] = [];

        for(var x = 0; x < game.width; x++) {
            game.map[y].push({
                terrain: 0
            });
        }
    }

    generateTerrain();
    generateGold();
}

function spawnPlayer() {
    var target = [randRange(0, game.width - 1), randRange(0, game.height - 1)];

    while(getCell(target[0], target[1]).terrain !== 0) {
        target = [randRange(0, game.width - 1), randRange(0, game.height - 1)];        
    }

    player.ch = player.ch.c(1, "yellow");
    player.x = target[0];
    player.y = target[1];

    setPlayer();
}

function initializePlayer() {
    levelup();
    player.hp = player.maxhp;
    spawnPlayer();
}

function heal(amount) {
    player.hp = Math.min(player.hp + amount, player.maxhp);
}

function damage(amount) {
    player.hp -= amount;

    if(Math.floor(player.hp) <= 0) {
        cls();
        console.log("You died!".c(1, "red"));
        process.exit();
    }
}

function levelup() {
    player.maxhp = 6 + player.stats.con + (level(true) * player.stats.con);

    for(var stat in player.stats) {
        player.stats[stat] += randRange(0, 1);
    }
}

function addxp(amount) {
    var before = level(true);
    
    player.xp += amount;

    if(level(true) > before) {
        levelup();
    }
}

//x and y are relative to the player's current position
function movePlayer(x, y) {
    var target = [player.x + x, player.y + y],
        cell;

    //Wrapping logic
    if(game.wrap) {
        if(target[1] === game.height) {
            target[1] = 0;
        } else if(target[1] === -1) {
            target[1] = game.height - 1;
        } else if(target[0] === game.width) {
            target[0] = 0;
        } else if(target[0] === -1) {
            target[0] = game.width - 1;
        }
    }

    cell = getCell(target[0], target[1]);

    //When wrapping is off, prevent moving off the map
    if(cell) {
        clearPlayer();

        player.x = target[0];
        player.y = target[1];
        
        heal(0.05 + +(player.stats.con / 200).toFixed(2));

        if(cell.terrain === 1) {
            //Forest
            addxp(30);
        } else if(cell.terrain === 2) {
            //Water
            addxp(30);
            damage(1);
        } else {
            //Empty
            addxp(20);
            heal(0.05);
        }

        if(cell.gold) {
            player.gold += cell.gold;
            cell.gold = 0;
        }

        setPlayer();
        writeMap();
    }
}

function clearPlayer() {
    writeCell(player.x, player.y, { player: false });
}

function setPlayer() {
    writeCell(player.x, player.y, { player: true });
}

function beginGame() {
    cls();
    generateMap();
    initializePlayer();
    writeMap();
}

parseInput();
beginGame();