import { POSITIONS, type CollegeProgram, type Position, type Subdivision } from "../types";
import { slugify } from "../lib/rng";
import { withCollegeImage } from "./collegeImages";

type ProgramGroup = {
  conference: string;
  subdivision: Subdivision;
  prestigeBase: number;
  competitionBase: number;
  teams: string[];
};

const powerPositions: Position[] = ["QB", "WR", "EDGE", "CB", "LT", "DL", "LB", "RB"];

const programGroups: ProgramGroup[] = [
  {
    conference: "ACC",
    subdivision: "FBS",
    prestigeBase: 76,
    competitionBase: 82,
    teams: [
      "Boston College|Eagles",
      "California|Golden Bears",
      "Clemson|Tigers",
      "Duke|Blue Devils",
      "Florida State|Seminoles",
      "Georgia Tech|Yellow Jackets",
      "Louisville|Cardinals",
      "Miami|Hurricanes",
      "NC State|Wolfpack",
      "North Carolina|Tar Heels",
      "Pittsburgh|Panthers",
      "SMU|Mustangs",
      "Stanford|Cardinal",
      "Syracuse|Orange",
      "Virginia|Cavaliers",
      "Virginia Tech|Hokies",
      "Wake Forest|Demon Deacons"
    ]
  },
  {
    conference: "Big Ten",
    subdivision: "FBS",
    prestigeBase: 81,
    competitionBase: 86,
    teams: [
      "Illinois|Fighting Illini",
      "Indiana|Hoosiers",
      "Iowa|Hawkeyes",
      "Maryland|Terrapins",
      "Michigan|Wolverines",
      "Michigan State|Spartans",
      "Minnesota|Golden Gophers",
      "Nebraska|Cornhuskers",
      "Northwestern|Wildcats",
      "Ohio State|Buckeyes",
      "Oregon|Ducks",
      "Penn State|Nittany Lions",
      "Purdue|Boilermakers",
      "Rutgers|Scarlet Knights",
      "UCLA|Bruins",
      "USC|Trojans",
      "Washington|Huskies",
      "Wisconsin|Badgers"
    ]
  },
  {
    conference: "Big 12",
    subdivision: "FBS",
    prestigeBase: 77,
    competitionBase: 83,
    teams: [
      "Arizona|Wildcats",
      "Arizona State|Sun Devils",
      "Baylor|Bears",
      "BYU|Cougars",
      "Cincinnati|Bearcats",
      "Colorado|Buffaloes",
      "Houston|Cougars",
      "Iowa State|Cyclones",
      "Kansas|Jayhawks",
      "Kansas State|Wildcats",
      "Oklahoma State|Cowboys",
      "TCU|Horned Frogs",
      "Texas Tech|Red Raiders",
      "UCF|Knights",
      "Utah|Utes",
      "West Virginia|Mountaineers"
    ]
  },
  {
    conference: "SEC",
    subdivision: "FBS",
    prestigeBase: 84,
    competitionBase: 89,
    teams: [
      "Alabama|Crimson Tide",
      "Arkansas|Razorbacks",
      "Auburn|Tigers",
      "Florida|Gators",
      "Georgia|Bulldogs",
      "Kentucky|Wildcats",
      "LSU|Tigers",
      "Mississippi State|Bulldogs",
      "Missouri|Tigers",
      "Oklahoma|Sooners",
      "Ole Miss|Rebels",
      "South Carolina|Gamecocks",
      "Tennessee|Volunteers",
      "Texas|Longhorns",
      "Texas A&M|Aggies",
      "Vanderbilt|Commodores"
    ]
  },
  {
    conference: "American",
    subdivision: "FBS",
    prestigeBase: 65,
    competitionBase: 71,
    teams: [
      "Army|Black Knights",
      "Charlotte|49ers",
      "East Carolina|Pirates",
      "Florida Atlantic|Owls",
      "Memphis|Tigers",
      "Navy|Midshipmen",
      "North Texas|Mean Green",
      "Rice|Owls",
      "South Florida|Bulls",
      "Temple|Owls",
      "Tulane|Green Wave",
      "Tulsa|Golden Hurricane",
      "UAB|Blazers",
      "UTSA|Roadrunners"
    ]
  },
  {
    conference: "Conference USA",
    subdivision: "FBS",
    prestigeBase: 58,
    competitionBase: 65,
    teams: [
      "Delaware|Blue Hens",
      "FIU|Panthers",
      "Jacksonville State|Gamecocks",
      "Kennesaw State|Owls",
      "Liberty|Flames",
      "Louisiana Tech|Bulldogs",
      "Middle Tennessee|Blue Raiders",
      "Missouri State|Bears",
      "New Mexico State|Aggies",
      "Sam Houston|Bearkats",
      "UTEP|Miners",
      "Western Kentucky|Hilltoppers"
    ]
  },
  {
    conference: "MAC",
    subdivision: "FBS",
    prestigeBase: 57,
    competitionBase: 64,
    teams: [
      "Akron|Zips",
      "Ball State|Cardinals",
      "Bowling Green|Falcons",
      "Buffalo|Bulls",
      "Central Michigan|Chippewas",
      "Eastern Michigan|Eagles",
      "Kent State|Golden Flashes",
      "Miami (OH)|RedHawks",
      "Northern Illinois|Huskies",
      "Ohio|Bobcats",
      "Toledo|Rockets",
      "UMass|Minutemen",
      "Western Michigan|Broncos"
    ]
  },
  {
    conference: "Mountain West",
    subdivision: "FBS",
    prestigeBase: 62,
    competitionBase: 69,
    teams: [
      "Air Force|Falcons",
      "Hawaii|Rainbow Warriors",
      "Nevada|Wolf Pack",
      "New Mexico|Lobos",
      "North Dakota State|Bison",
      "San Jose State|Spartans",
      "UNLV|Rebels",
      "Wyoming|Cowboys"
    ]
  },
  {
    conference: "Pac-12",
    subdivision: "FBS",
    prestigeBase: 68,
    competitionBase: 75,
    teams: [
      "Boise State|Broncos",
      "Colorado State|Rams",
      "Fresno State|Bulldogs",
      "Oregon State|Beavers",
      "San Diego State|Aztecs",
      "Texas State|Bobcats",
      "Utah State|Aggies",
      "Washington State|Cougars"
    ]
  },
  {
    conference: "Sun Belt",
    subdivision: "FBS",
    prestigeBase: 61,
    competitionBase: 68,
    teams: [
      "Appalachian State|Mountaineers",
      "Arkansas State|Red Wolves",
      "Coastal Carolina|Chanticleers",
      "Georgia Southern|Eagles",
      "Georgia State|Panthers",
      "James Madison|Dukes",
      "Louisiana|Ragin' Cajuns",
      "Marshall|Thundering Herd",
      "Old Dominion|Monarchs",
      "South Alabama|Jaguars",
      "Southern Miss|Golden Eagles",
      "Troy|Trojans",
      "ULM|Warhawks"
    ]
  },
  {
    conference: "FBS Independents",
    subdivision: "FBS",
    prestigeBase: 72,
    competitionBase: 76,
    teams: ["Notre Dame|Fighting Irish", "UConn|Huskies"]
  },
  {
    conference: "Big Sky",
    subdivision: "FCS",
    prestigeBase: 54,
    competitionBase: 59,
    teams: [
      "Cal Poly|Mustangs",
      "Eastern Washington|Eagles",
      "Idaho|Vandals",
      "Idaho State|Bengals",
      "Montana|Grizzlies",
      "Montana State|Bobcats",
      "Northern Arizona|Lumberjacks",
      "Portland State|Vikings",
      "Sacramento State|Hornets",
      "UC Davis|Aggies",
      "Weber State|Wildcats"
    ]
  },
  {
    conference: "CAA",
    subdivision: "FCS",
    prestigeBase: 52,
    competitionBase: 58,
    teams: [
      "Albany|Great Danes",
      "Campbell|Camels",
      "Elon|Phoenix",
      "Hampton|Pirates",
      "Maine|Black Bears",
      "Monmouth|Hawks",
      "New Hampshire|Wildcats",
      "North Carolina A&T|Aggies",
      "Rhode Island|Rams",
      "Richmond|Spiders",
      "Sacred Heart|Pioneers",
      "Stony Brook|Seawolves",
      "Towson|Tigers",
      "Villanova|Wildcats"
    ]
  },
  {
    conference: "Ivy League",
    subdivision: "FCS",
    prestigeBase: 48,
    competitionBase: 54,
    teams: [
      "Brown|Bears",
      "Columbia|Lions",
      "Cornell|Big Red",
      "Dartmouth|Big Green",
      "Harvard|Crimson",
      "Penn|Quakers",
      "Princeton|Tigers",
      "Yale|Bulldogs"
    ]
  },
  {
    conference: "MVFC",
    subdivision: "FCS",
    prestigeBase: 56,
    competitionBase: 62,
    teams: [
      "Illinois State|Redbirds",
      "Indiana State|Sycamores",
      "Murray State|Racers",
      "North Dakota|Fighting Hawks",
      "Northern Iowa|Panthers",
      "South Dakota|Coyotes",
      "South Dakota State|Jackrabbits",
      "Southern Illinois|Salukis",
      "Youngstown State|Penguins"
    ]
  },
  {
    conference: "MEAC",
    subdivision: "FCS",
    prestigeBase: 43,
    competitionBase: 49,
    teams: [
      "Delaware State|Hornets",
      "Howard|Bison",
      "Morgan State|Bears",
      "Norfolk State|Spartans",
      "North Carolina Central|Eagles",
      "South Carolina State|Bulldogs"
    ]
  },
  {
    conference: "Patriot League",
    subdivision: "FCS",
    prestigeBase: 43,
    competitionBase: 50,
    teams: [
      "Bucknell|Bison",
      "Colgate|Raiders",
      "Fordham|Rams",
      "Georgetown|Hoyas",
      "Holy Cross|Crusaders",
      "Lafayette|Leopards",
      "Lehigh|Mountain Hawks"
    ]
  },
  {
    conference: "Pioneer League",
    subdivision: "FCS",
    prestigeBase: 39,
    competitionBase: 45,
    teams: [
      "Butler|Bulldogs",
      "Davidson|Wildcats",
      "Dayton|Flyers",
      "Drake|Bulldogs",
      "Marist|Red Foxes",
      "Morehead State|Eagles",
      "Presbyterian|Blue Hose",
      "San Diego|Toreros",
      "St. Thomas|Tommies",
      "Stetson|Hatters",
      "Valparaiso|Beacons"
    ]
  },
  {
    conference: "NEC",
    subdivision: "FCS",
    prestigeBase: 39,
    competitionBase: 45,
    teams: [
      "Central Connecticut|Blue Devils",
      "Chicago State|Cougars",
      "Duquesne|Dukes",
      "LIU|Sharks",
      "Mercyhurst|Lakers",
      "Robert Morris|Colonials",
      "Stonehill|Skyhawks",
      "Wagner|Seahawks"
    ]
  },
  {
    conference: "SoCon",
    subdivision: "FCS",
    prestigeBase: 49,
    competitionBase: 55,
    teams: [
      "Chattanooga|Mocs",
      "ETSU|Buccaneers",
      "Furman|Paladins",
      "Mercer|Bears",
      "Samford|Bulldogs",
      "The Citadel|Bulldogs",
      "VMI|Keydets",
      "Western Carolina|Catamounts",
      "Wofford|Terriers"
    ]
  },
  {
    conference: "Southland",
    subdivision: "FCS",
    prestigeBase: 47,
    competitionBase: 53,
    teams: [
      "Houston Christian|Huskies",
      "Incarnate Word|Cardinals",
      "Lamar|Cardinals",
      "McNeese|Cowboys",
      "Nicholls|Colonels",
      "Northwestern State|Demons",
      "Southeastern Louisiana|Lions",
      "Stephen F. Austin|Lumberjacks"
    ]
  },
  {
    conference: "SWAC",
    subdivision: "FCS",
    prestigeBase: 46,
    competitionBase: 52,
    teams: [
      "Alabama A&M|Bulldogs",
      "Alabama State|Hornets",
      "Alcorn State|Braves",
      "Bethune-Cookman|Wildcats",
      "Florida A&M|Rattlers",
      "Grambling State|Tigers",
      "Jackson State|Tigers",
      "Mississippi Valley State|Delta Devils",
      "Prairie View A&M|Panthers",
      "Southern|Jaguars",
      "Texas Southern|Tigers",
      "UAPB|Golden Lions"
    ]
  },
  {
    conference: "UAC",
    subdivision: "FCS",
    prestigeBase: 47,
    competitionBase: 53,
    teams: [
      "Abilene Christian|Wildcats",
      "Austin Peay|Governors",
      "Central Arkansas|Bears",
      "Eastern Kentucky|Colonels",
      "North Alabama|Lions",
      "Southern Utah|Thunderbirds",
      "Tarleton State|Texans",
      "Utah Tech|Trailblazers",
      "West Georgia|Wolves"
    ]
  },
  {
    conference: "Big South-OVC",
    subdivision: "FCS",
    prestigeBase: 44,
    competitionBase: 50,
    teams: [
      "Charleston Southern|Buccaneers",
      "Eastern Illinois|Panthers",
      "Gardner-Webb|Runnin' Bulldogs",
      "Lindenwood|Lions",
      "Southeast Missouri State|Redhawks",
      "Tennessee State|Tigers",
      "Tennessee Tech|Golden Eagles",
      "UT Martin|Skyhawks",
      "Western Illinois|Leathernecks"
    ]
  }
];

function ratingBump(name: string, index: number): number {
  const codeSum = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return ((codeSum + index * 7) % 13) - 5;
}

function schemeFor(name: string): CollegeProgram["scheme"] {
  const schemes: CollegeProgram["scheme"][] = ["pro", "spread", "power", "air-raid", "multiple"];
  const index = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % schemes.length;
  return schemes[index];
}

function strengthsFor(name: string, mascot: string): Position[] {
  const start = ([...name, ...mascot].reduce((sum, char) => sum + char.charCodeAt(0), 0) % powerPositions.length);
  return [powerPositions[start], powerPositions[(start + 3) % powerPositions.length], POSITIONS[(start + 6) % POSITIONS.length]];
}

export const collegePrograms: CollegeProgram[] = programGroups.flatMap((group) =>
  group.teams.map((entry, index) => {
    const [name, mascot] = entry.split("|");
    const bump = ratingBump(name, index);
    return withCollegeImage({
      id: slugify(`${name}-${group.conference}`),
      name,
      mascot,
      conference: group.conference,
      subdivision: group.subdivision,
      prestige: Math.max(25, Math.min(96, group.prestigeBase + bump)),
      competition: Math.max(25, Math.min(96, group.competitionBase + Math.round(bump / 2))),
      scheme: schemeFor(name),
      strengths: strengthsFor(name, mascot)
    });
  })
);
